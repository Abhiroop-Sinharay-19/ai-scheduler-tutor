"""QLoRA SFT for tutor behavior. Requires an NVIDIA CUDA GPU; no CPU fallback."""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
DATA = HERE / "data"
OUT = HERE / "artifacts" / "qwen3-4b-process-tutor-qlora"
BASE_MODEL = "Qwen/Qwen3-4B-Instruct-2507"

def load_jsonl(path: Path, dataset_type):
    with path.open(encoding="utf-8") as file:
        rows = [json.loads(line) for line in file if line.strip()]
    return dataset_type.from_list([{"messages": row["training_messages"]} for row in rows])

def main() -> None:
    try:
        import torch
        from datasets import Dataset
        from peft import LoraConfig
        from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
        from trl import SFTConfig, SFTTrainer
    except ImportError as error:
        raise SystemExit(
            "Training dependencies are missing. Install CUDA-enabled PyTorch and training/requirements.txt first. "
            f"Missing import: {error.name or error}"
        ) from error
    if not torch.cuda.is_available():
        raise SystemExit("CUDA GPU is unavailable. QLoRA training was not started; use a CUDA-enabled NVIDIA GPU host.")
    if torch.cuda.device_count() < 1:
        raise SystemExit("No CUDA device is visible to PyTorch.")
    print(f"Training on {torch.cuda.get_device_name(0)} ({torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GiB VRAM)")
    if not (DATA / "train.jsonl").exists():
        raise SystemExit("Training data missing. Run: python training/build_dataset.py")

    bf16 = torch.cuda.is_bf16_supported()
    compute_dtype = torch.bfloat16 if bf16 else torch.float16
    quantization = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_use_double_quant=True,
        bnb_4bit_compute_dtype=compute_dtype,
    )
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL, use_fast=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=quantization,
        device_map="auto",
        torch_dtype=compute_dtype,
        low_cpu_mem_usage=True,
    )
    model.config.use_cache = False
    train = load_jsonl(DATA / "train.jsonl", Dataset)
    validation = load_jsonl(DATA / "validation.jsonl", Dataset)
    lora = LoraConfig(
        r=16,
        lora_alpha=32,
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )
    args = SFTConfig(
        output_dir=str(OUT),
        num_train_epochs=3,
        per_device_train_batch_size=1,
        per_device_eval_batch_size=1,
        gradient_accumulation_steps=8,
        learning_rate=1.0e-4,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        weight_decay=0.01,
        max_length=2048,
        packing=False,
        assistant_only_loss=True,
        gradient_checkpointing=True,
        gradient_checkpointing_kwargs={"use_reentrant": False},
        bf16=bf16,
        fp16=not bf16,
        optim="paged_adamw_8bit",
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        save_total_limit=2,
        logging_steps=10,
        report_to="none",
        seed=42,
        data_seed=42,
        dataloader_num_workers=0,
    )
    trainer = SFTTrainer(
        model=model,
        args=args,
        train_dataset=train,
        eval_dataset=validation,
        processing_class=tokenizer,
        peft_config=lora,
    )
    result = trainer.train()
    metrics = trainer.evaluate()
    trainer.save_model(str(OUT))
    tokenizer.save_pretrained(OUT)
    record = {
        "base_model":BASE_MODEL,
        "train_runtime_seconds":result.metrics.get("train_runtime"),
        "train_loss":result.metrics.get("train_loss"),
        "validation_loss":metrics.get("eval_loss"),
        "global_steps":result.global_step,
        "cuda_device":torch.cuda.get_device_name(0),
        "vram_gib":round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2),
        "qlora":{"bits":4,"quant":"nf4","double_quant":True,"lora_r":16,"lora_alpha":32,"dropout":0.05},
    }
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "training_metrics.json").write_text(json.dumps(record, indent=2), encoding="utf-8")
    print(json.dumps(record, indent=2))

if __name__ == "__main__":
    main()
