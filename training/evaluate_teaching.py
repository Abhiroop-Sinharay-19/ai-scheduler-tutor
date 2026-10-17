"""Paired base-vs-adapter generation and transparent heuristic rubric report.

The rubric is a screening aid, not a substitute for a human teaching-quality review.
Run after training: python training/evaluate_teaching.py
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

HERE = Path(__file__).resolve().parent
BASE = "Qwen/Qwen3-4B-Instruct-2507"
ADAPTER = HERE / "artifacts" / "qwen3-4b-process-tutor-qlora"
EVAL_FILE = HERE / "data" / "evaluation.jsonl"

def load_eval(limit: int | None) -> list[dict]:
    rows = [json.loads(line) for line in EVAL_FILE.read_text(encoding="utf-8").splitlines() if line.strip()]
    return rows[:limit] if limit else rows

def load_model(adapter: bool):
    if not torch.cuda.is_available():
        raise SystemExit("Evaluation generation requires CUDA to load Qwen3-4B. No model output was generated.")
    dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    quant = BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type="nf4", bnb_4bit_use_double_quant=True, bnb_4bit_compute_dtype=dtype)
    tokenizer = AutoTokenizer.from_pretrained(BASE, use_fast=True)
    model = AutoModelForCausalLM.from_pretrained(BASE, quantization_config=quant, device_map="auto", torch_dtype=dtype)
    if adapter:
        if not ADAPTER.exists():
            raise SystemExit(f"Adapter not found at {ADAPTER}; train first.")
        model = PeftModel.from_pretrained(model, ADAPTER)
    model.eval()
    return model, tokenizer

def generate(model, tokenizer, messages: list[dict]) -> str:
    prompt = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_tensors="pt").to(model.device)
    with torch.inference_mode():
        output = model.generate(prompt, max_new_tokens=220, do_sample=False, repetition_penalty=1.05)
    return tokenizer.decode(output[0, prompt.shape[-1]:], skip_special_tokens=True).strip()

def heuristic_scores(text: str) -> dict[str, int]:
    q = int("?" in text)
    hint = int(bool(re.search(r"hint|think about|consider|clue|try once more|what happens", text, re.I)))
    constructive = int(bool(re.search(r"common|close|not quite|let's reason|you are mixing|you're mixing", text, re.I)))
    dump = int(len(text.split()) > 145 or bool(re.search(r"the answer is|therefore the complete answer", text, re.I)))
    return {"useful_question":q,"hint_or_reasoning_cue":hint,"constructive_correction":constructive,"possible_answer_dump":dump}

def expected_marker(text: str, marker: str) -> int:
    if marker == "question": return int("?" in text)
    if marker == "hint": return int(bool(re.search(r"hint|think about|consider|clue|try once more|what happens", text, re.I)))
    if marker == "numerical": return int("P2" in text and "4" in text and "wait" in text.lower())
    if marker == "connect": return int(bool(re.search(r"FCFS|arrival|earlier|previous", text, re.I)))
    if marker == "feedback": return int(bool(re.search(r"exactly|correct|right|good|yes", text, re.I)))
    return 0

def main() -> None:
    parser=argparse.ArgumentParser()
    parser.add_argument("--limit",type=int,default=None,help="Quick run; omit to evaluate the full held-out set")
    parser.add_argument("--output",type=Path,default=HERE/"artifacts"/"paired_teaching_evaluation.json")
    args=parser.parse_args()
    rows=load_eval(args.limit)
    if not rows:
        raise SystemExit("Evaluation set is empty; build it first.")
    baseline, tokenizer=load_model(adapter=False)
    base_outputs=[]
    for row in rows:
        base_outputs.append(generate(baseline,tokenizer,row["messages"]))
    del baseline
    if torch.cuda.is_available(): torch.cuda.empty_cache()
    tuned, tokenizer=load_model(adapter=True)
    tuned_outputs=[generate(tuned,tokenizer,row["messages"]) for row in rows]
    results=[]
    for row,base_text,tuned_text in zip(rows,base_outputs,tuned_outputs):
        base_score=heuristic_scores(base_text)
        tuned_score=heuristic_scores(tuned_text)
        if "expected_marker" in row:
            base_score["case_expected_marker"]=expected_marker(base_text,row["expected_marker"])
            tuned_score["case_expected_marker"]=expected_marker(tuned_text,row["expected_marker"])
        results.append({"id":row["id"],"topic":row["topic"],"skill":row["skill"],"difficulty":row["difficulty"],"base":{"text":base_text,"rubric":base_score},"adapter":{"text":tuned_text,"rubric":tuned_score}})
    def totals(model: str) -> dict:
        keys=sorted({key for item in results for key in item[model]["rubric"]})
        return {key:round(sum(item[model]["rubric"][key] for item in results if key in item[model]["rubric"])/sum(key in item[model]["rubric"] for item in results),3) for key in keys}
    report={"base_model":BASE,"adapter_path":str(ADAPTER),"examples":len(results),"rubric_note":"Automated behavioral markers only; inspect paired outputs before changing production.","base_mean_markers":totals("base"),"adapter_mean_markers":totals("adapter"),"results":results}
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
    print(json.dumps({k:v for k,v in report.items() if k!="results"},indent=2))

if __name__=="__main__":
    main()
