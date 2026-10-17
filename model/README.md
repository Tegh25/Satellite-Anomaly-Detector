---
base_model: Qwen/Qwen3-4B-Instruct-2507
library_name: peft
license: apache-2.0
language:
  - en
pipeline_tag: text-generation
tags:
  - lora
  - qlora
  - peft
  - satellite
  - telemetry
  - anomaly-detection
  - distillation
---

# Satellite telemetry anomaly reporter (Qwen3-4B, LoRA)

A LoRA adapter for `Qwen/Qwen3-4B-Instruct-2507` that turns the engineered features of one flagged satellite telemetry segment, plus its label, into a short mission-ops assessment: which statistics matter, the likely cause, and the next step for the ops team.

It is the explanation half of a two-stage pipeline. A Random Forest detector decides whether a segment is anomalous, and this model writes the report for that flag. **It does not detect anomalies and it does not check the flag it is given.**

## Intended use

- Explaining already-flagged segments from the OPSSAT-AD feature format, as a portfolio and research demonstration.
- Not for operational spacecraft decisions. The reports are plausible narratives, not verified diagnoses (see Limitations).

## How it was built

1. **Data.** OPSSAT-AD: 2,123 telemetry segments from ESA's OPS-SAT spacecraft, each described by 15 engineered features (no raw waveforms), about 20% labelled anomalous. TODO: add the dataset citation and licence from its page.
2. **Teacher reports.** A larger model (Claude Sonnet 5) wrote one report per segment from the features and the label. A prompt-engineering pass locked the format (plain prose, no markdown, no em dashes) and removed dataset-statistic language. A quality gate dropped any report that broke those rules.
3. **Student.** `Qwen3-4B-Instruct-2507` fine-tuned with QLoRA on the teacher reports, with the loss computed on the report tokens only.
4. **Detector.** A Random Forest (`class_weight="balanced"`) trained on the provided train split. TODO: paste the detector's accuracy, precision and recall on the 529-row test split.

## Usage

The adapter expects exactly the prompt format it was trained on.

```python
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel

BASE = 'Qwen/Qwen3-4B-Instruct-2507'
ADAPTER = 'TODO-username/satellite-anomaly-reporter-qwen3-4b-lora'

tok = AutoTokenizer.from_pretrained(ADAPTER)
model = AutoModelForCausalLM.from_pretrained(
    BASE, device_map='auto',
    quantization_config=BitsAndBytesConfig(load_in_4bit=True, bnb_4bit_quant_type='nf4',
                                           bnb_4bit_compute_dtype=torch.float16))
model = PeftModel.from_pretrained(model, ADAPTER)

SYSTEM = ('You are a spacecraft operations engineer. You receive pre-computed statistical features of one flagged '
          'telemetry segment (not raw sensor values) plus its label. Write a concise, evidence-based mission-ops '
          'assessment in plain prose: which statistics drive your assessment, the likely cause, and the next step '
          'for the ops team.')

user = """Channel: CADC0872
Segment length: 257 samples over 265 time units
Mean: 1.17079e-05, Std dev: 2.3e-05, Variance: 5.59e-10
Kurtosis: -1.484, Skew: -0.060
Peak count (raw / smoothed-10 / smoothed-20): 1 / 1 / 1
Derivative peak count (1st / 2nd diff): 78 / 87
Derivative variance (1st / 2nd diff): 5.5e-13 / 7e-13
Sampling gap irregularity: 357
Label: NOMINAL"""   # example values; Label is ANOMALY or NOMINAL

msgs = [{'role': 'system', 'content': SYSTEM}, {'role': 'user', 'content': user}]
text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
inputs = tok(text, return_tensors='pt').to(model.device)
out = model.generate(**inputs, max_new_tokens=450, do_sample=False)
print(tok.decode(out[0][inputs['input_ids'].shape[1]:], skip_special_tokens=True))
```

## Evaluation

Evaluated on test segments never used for training or checkpoint selection: 158 segments (79 anomalies, 79 nominal, a balanced sample that includes all 18 segments the detector got wrong). Rates are shown with 95% Wilson intervals, so they describe generation quality on this balanced sample, not population rates. All arms generate with greedy decoding.

| | Teacher (Sonnet 5) | This model | Base model, prompted |
|---|---|---|---|
| Format-compliant (no markdown, em dashes, dataset language, or truncation) | 100% [98-100] | 100% [98-100] | 41% [33-48] |
| Reports using em dashes | 0% | 0% | 59% [52-67] |
| Mean words | 164 | 158 | 156 |
| Reports with at least one number not found in the prompt | 6% [3-10] | 6% [3-10] | 1% [0-4] |
| Verdict matches the label given | 100% | 100% | 100% |

"Base model, prompted" is the same Qwen3-4B with no adapter and a detailed style prompt. Its format failures are almost entirely em dashes, which a text filter would fix, so the format result mainly shows consistency without post-processing and without a long style prompt. Its lower rate of unsupported numbers comes from copying numbers verbatim, while the teacher and this model paraphrase and derive values such as ratios.

**Blind pairwise LLM judge** (Claude Sonnet 5, A/B order randomized, 60 segments per pair, half anomalies and half nominal):

| Comparison | Wins | Ties | Losses | Unsupported claims per report |
|---|---|---|---|---|
| This model vs prompted base | 53 | 2 | 5 | 0.55 vs 1.47 |
| This model vs teacher | 21 | 21 | 18 | 0.40 vs 0.42 |

The judge is the same model family as the teacher, so it likely favours the teacher's writing style, and this model imitates that style. Read the first row as a clear but probably overstated edge over prompting, and the second as parity with the teacher.

## Limitations

- **It trusts the label it is given.** When the detector's flag was wrong, the report followed the wrong flag in 18 of 18 cases (8 false alarms, 10 missed anomalies). A missed anomaly becomes a confident "no action needed". In the demo this is mitigated by showing the detector's probability and flagging low-confidence segments: TODO, state the cross-validated review-band result here.
- **Causes are not verified.** The dataset has only a binary label, with no ground-truth cause. The reports contain plausible physical explanations (thermal or power transients, sensor connection issues, timing faults) that the features do not establish. The number check cannot catch invented causes.
- **It over-weights timing explanations.** On the same 79 anomaly segments, the model recommends a timing- or telemetry-focused next step more often than its teacher (82% vs 66%; it did so 22 times where the teacher did not, and the reverse 9 times, sign test p = 0.029). Greedy decoding amplifies the teacher's majority habit.
- **Inherits the teacher's flaws.** The student matches its teacher's quality and its limitations.
- **Narrow scope.** One dataset, features rather than raw signals, English only, and a small evaluation sample with wide intervals.
- **Judge bias.** See above.

## Training details

- Base: `Qwen/Qwen3-4B-Instruct-2507`, 4-bit NF4 quantization with double quantization.
- LoRA: r = 16, alpha = 32, dropout = 0.05, on `q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`.
- Optimization: learning rate 2e-4, cosine schedule, 8 warmup steps, 3 epochs, per-device batch 4 with 4 accumulation steps (effective batch 16), gradient checkpointing, fp16 on a Colab T4.
- Loss on the completion (report) tokens only. Best checkpoint chosen by validation loss (about 0.71 at the end, with training loss about 0.58).
- Data: TODO train and validation example counts after the quality gate. Split: the dataset's provided train/test split, with 15% of the training pool held out for validation.
- Versions: transformers 5.18.0, trl 1.15.0, peft 0.21.1, torch 2.11.0.

## Data, teacher, and licence

- Adapter licence: Apache 2.0, matching the base model.
- Training reports were generated with Claude Sonnet 5 (via Backboard). TODO: confirm that publishing a model trained on those outputs is consistent with the provider's terms.
- Dataset: OPSSAT-AD. TODO: licence and citation.
