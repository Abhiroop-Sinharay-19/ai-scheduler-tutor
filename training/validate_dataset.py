"""Dependency-free structural/quality checks for generated tutoring splits."""
from __future__ import annotations
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent / "data"
EXPECTED = {"train": 505, "validation": 80, "evaluation": 92}
REQUIRED_EVAL_SKILLS = {
    "active_recall", "misconception_handling", "hint_first", "cumulative_recall",
    "self_explanation", "difficulty_adaptation", "concept_comparison",
    "numerical_explanation", "previous_topic_connection", "avoid_answer_dump",
    "useful_question", "conversation_continuity",
}

def read_split(name: str) -> list[dict]:
    path = DATA / f"{name}.jsonl"
    if not path.exists(): raise AssertionError(f"Missing split: {path}")
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]

def main() -> None:
    splits = {name: read_split(name) for name in EXPECTED}
    ids=set()
    for name,rows in splits.items():
        assert len(rows)==EXPECTED[name], f"{name}: expected {EXPECTED[name]}, found {len(rows)}"
        for row in rows:
            assert row["id"] not in ids, f"duplicate ID {row['id']}"
            ids.add(row["id"])
            assert row["split"]==name
            assert row["messages"] and row["messages"][0]["role"]=="system"
            assert row["messages"][-1]["role"]=="user", f"{row['id']} must end with the current learner turn"
            assert all(m["role"] in {"system","user","assistant"} and m["content"].strip() for m in row["messages"])
            if name != "evaluation" or "expected_marker" not in row:
                assert row.get("target", "").strip(), f"No target answer for {row['id']}"
            if "target" in row:
                assert row["training_messages"][-1] == {"role":"assistant","content":row["target"]}, f"missing assistant target for {row['id']}"
            assert row["source"]["filename"].endswith(".pptx") and row["source"]["page"] > 0
    eval_skills={row["skill"] for row in splits["evaluation"] if row["id"].startswith("eval-rubric-")}
    assert eval_skills==REQUIRED_EVAL_SKILLS, f"evaluation probes missing: {REQUIRED_EVAL_SKILLS-eval_skills}"
    assert len({row["id"] for row in splits["train"]}.intersection(row["id"] for row in splits["evaluation"]))==0
    for name in EXPECTED:
        numerical=[row for row in splits[name] if row.get("skill")=="deterministic_numerical_explanation"]
        assert len(numerical)==5, f"{name} must include the five-turn numerical tutoring case"
        assert all(row["deterministic_fixture"]["avgWaiting"]==3.33 for row in numerical)
    print(f"PASS: train={len(splits['train'])}, validation={len(splits['validation'])}, evaluation={len(splits['evaluation'])}, total={sum(map(len,splits.values()))}")
    print(f"PASS: {len(REQUIRED_EVAL_SKILLS)} held-out teaching categories and deterministic-scheduler fixtures are present.")

if __name__=="__main__": main()
