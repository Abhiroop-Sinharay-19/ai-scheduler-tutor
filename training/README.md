# QLoRA process-scheduling tutor

This is an optional teaching-behavior adapter experiment. It does not replace the existing RAG system, Supabase data, scheduling implementation, chat UI, or deployed model by itself.

## What is prepared

- `build_dataset.py` creates source-grounded tutoring conversations from authored lesson cards based on the Process Scheduling slides in `notes for process`; it does not copy slide text wholesale.
- The fixed split is 100 train episodes, 15 validation episodes, and 15 evaluation episodes, plus a deterministic FCFS numerical episode in each split and 12 held-out behavior probes. Each five-turn episode contributes five assistant-response training examples.
- The numeric fixture was checked against the existing `src/lib/scheduling.ts` `runSchedule()` implementation. The tutor examples receive its result and explain it; the model is told not to recalculate.
- `train_qlora.py` performs 4-bit NF4 QLoRA SFT with assistant-only loss. It saves the adapter and training/validation metrics under ignored `training/artifacts/`.
- `evaluate_teaching.py` compares the base and adapter on exactly the same held-out prompts and saves paired outputs. Its automated markers are only a screening rubric; read paired outputs before deciding to switch production.

## Base model and training settings

Base: `Qwen/Qwen3-4B-Instruct-2507` (Apache-2.0, instruction-tuned). The application's current OpenRouter model is much larger and cannot be fine-tuned through OpenRouter as a LoRA adapter. This separate 4B base is selected for adapter deployment portability, not as a claim that it fits the current computer.

Training uses 4-bit NF4 + double quantization; LoRA rank 16, alpha 32, dropout 0.05, attention and MLP projections; sequence length 2048; batch size 1 with 8-step gradient accumulation; three epochs; assistant-only loss; and best validation loss checkpoint selection. VRAM demand depends on the GPU/runtime and sequence lengths. Run only on a CUDA-enabled NVIDIA host with enough free memory; the script reports the detected device and fails instead of silently switching to CPU.

## Build and train

Use Python 3.11 or 3.12 in a dedicated environment. Install the CUDA-enabled PyTorch build recommended by the official PyTorch install selector for the host, then install the project training dependencies and create data:

```powershell
py -3.11 -m venv .venv-training
.\.venv-training\Scripts\Activate.ps1
# Install the CUDA PyTorch wheel selected for your host from https://pytorch.org/get-started/locally/
python -m pip install -r training/requirements.txt
python training/build_dataset.py
python training/train_qlora.py
python training/evaluate_teaching.py
```

Do not commit `.venv-training/`, model checkpoints, or adapter artifacts. Evaluation needs the same CUDA-capable environment. Preserve the JSON paired output for manual review and reporting.

## Hosting and existing-app route

After training and review, vLLM can serve the adapter using the OpenAI-compatible endpoint. Upload the adapter directory to private model storage or the inference host; keep the base model `Qwen/Qwen3-4B-Instruct-2507` available to the serving host. Example vLLM setup:

```bash
vllm serve Qwen/Qwen3-4B-Instruct-2507 \
  --enable-lora \
  --lora-modules process-tutor=/models/process-tutor-adapter
```

The existing `supabase/functions/api` Edge Function now has an **opt-in** OpenAI-compatible route. Its default remains the current OpenRouter model. Only after a trained adapter has been hosted and evaluated, configure all three values as Supabase Edge Function secrets:

- `FINETUNED_QWEN_BASE_URL`: endpoint origin (for example `https://inference.example.com`; the function appends `/v1/chat/completions`, or accepts an origin ending in `/v1`).
- `FINETUNED_QWEN_MODEL`: served adapter name, e.g. `process-tutor`.
- `FINETUNED_QWEN_API_KEY`: server-side endpoint credential.

The browser never receives this endpoint credential. Supplying any subset is treated as a configuration error. Leaving all three unset preserves the current OpenRouter route. The same backend continues to embed the question, retrieve Supabase pgvector sources, preserve the chat session, include deterministic schedule output, and return citations; only the completion provider changes when the opt-in endpoint is fully configured.

No adapter is currently trained or deployed. Production should stay on the current model until a real GPU training run completes and the paired evaluation demonstrates an improvement.
