# Satellite Anomaly Reporter

**A Random Forest flags spacecraft telemetry. A fine-tuned 4B LLM explains the flag in mission-ops language.**

Two-minute tour (phone-friendly): open the [live demo](https://tegh25-satellite-anomaly-reporter.static.hf.space/index.html#/), click **Random segment**, then skim **Results** and **Show me a failure**. The model card is on [Hugging Face](https://huggingface.co/Tegh25/satellite-anomaly-reporter-qwen3-4b-lora).

| | |
|---|---|
| **Live demo** | [tegh25-satellite-anomaly-reporter.static.hf.space](https://tegh25-satellite-anomaly-reporter.static.hf.space/index.html#/) |
| **Space page** | [huggingface.co/spaces/Tegh25/satellite-anomaly-reporter](https://huggingface.co/spaces/Tegh25/satellite-anomaly-reporter) (Static Space · 1 like) |
| **Model** | [Tegh25/satellite-anomaly-reporter-qwen3-4b-lora](https://huggingface.co/Tegh25/satellite-anomaly-reporter-qwen3-4b-lora) (Qwen3-4B LoRA · Apache 2.0 · 1 like) |
| **Data** | [OPSSAT-AD](https://zenodo.org/records/12588359) — ESA OPS-SAT telemetry features (CC BY 4.0) |

Hugging Face does not publish public visit counts for Spaces; the Hub API only exposes likes and runtime metadata for this Space.

---

## What this is

Spacecraft ops get more telemetry than humans can read. Classic detectors can flag weird segments; they do not say *why* or *what to do next*. This project closes that gap with a two-stage pipeline:

```
15 engineered features  →  Random Forest  →  fine-tuned Qwen3-4B (LoRA)  →  short ops report
(per telemetry segment)     flag + probability     explains the flag (not the raw signal)
```

1. **Detect** — Random Forest on 15 OPSSAT-AD statistics (no raw waveforms). Test set: accuracy **0.964**, precision **0.927**, recall **0.903** (19 errors on 529 segments).
2. **Explain** — A QLoRA adapter on `Qwen/Qwen3-4B-Instruct-2507`, distilled from teacher reports (Claude Sonnet 5), writes a plain-prose assessment: which stats matter, a plausible cause, and a next step for ops.

The reporter **does not detect anomalies** and **does not second-guess the flag it is given**. That limitation is intentional to show, and the demo surfaces it.

**Not for flight decisions.** Reports are plausible narratives on a research dataset, not verified diagnoses. The dataset has binary labels only — no ground-truth causes.

---

## Highlights (for skimming)

- **End-to-end ML + product:** classical detector, LLM fine-tune (QLoRA on Colab), evaluation with baselines and a blind LLM judge, then a static React demo of real held-out outputs.
- **Honest evaluation:** format compliance, unsupported-number checks, pairwise preference vs prompted base and vs teacher, plus failure analysis when the detector is wrong.
- **Failure modes are first-class:** when the detector errs, the report followed the wrong flag in **18/18** cases. An uncertain-probability review band can catch most of those errors for human review.
- **Zero-cost public demo:** static site (Vite + React + TypeScript), precomputed reports, no live inference, no analytics cookies, no CDN deps — hosted as a free [Hugging Face Static Space](https://huggingface.co/spaces/Tegh25/satellite-anomaly-reporter).

---

## Results (held-out evaluation)

**Detector** (529 test segments): accuracy 0.964 · precision 0.927 · recall 0.903.

**Reporter** (158 balanced test segments never used for training or checkpoint selection; 95% Wilson intervals):

| | Teacher (Sonnet 5) | This model | Base Qwen3-4B, prompted |
|---|---|---|---|
| Format-compliant | 100% | **100%** | 41% |
| Unsupported number in report | 6% | **6%** | 1% |
| Verdict matches given label | 100% | **100%** | 100% |

Blind pairwise judge (Claude Sonnet 5, 60 segments per pair, order randomized):

| Comparison | Wins / ties / losses |
|---|---|
| This model vs prompted base | **53 / 2 / 5** |
| This model vs teacher | 21 / 21 / 18 (near parity) |

The judge shares a family with the teacher, so the win over prompting is likely overstated; vs teacher, treat it as roughly tied. Full numbers and caveats live on the [model card](https://huggingface.co/Tegh25/satellite-anomaly-reporter-qwen3-4b-lora) and the demo’s Results page.

**Main limitation:** the model trusts its input label. On detector mistakes it explained the wrong flag every time. Flagging uncertain detector probabilities (e.g. 0.1–0.9) for manual review catches most of those errors on this split — optimistic on only 19 errors, not a validated operating point.

---

## Repo layout

```
app/      Static demo (Vite, React, TypeScript). Real precomputed outputs in public/data/.
model/   Training/eval notebooks, report generation, model card source, dataset CSV.
```

| Path | Role |
|---|---|
| [`app/`](app/README.md) | Product demo: explorer, segment detail, detector failures, blind compare, results. Spec in [`app/SPEC.md`](app/SPEC.md). |
| [`model/`](model/README.md) | QLoRA fine-tune + evaluation story (mirrors the Hub model card). |

### Run the demo locally

```bash
cd app
npm install
npm run dev      # http://localhost:5173 — real test segments
npm test
npm run build
```

Requires Node 20+. Deploy to the Hugging Face Static Space with `npm run deploy:space` (see [`app/README.md`](app/README.md)).

### Use the adapter

```python
from peft import PeftModel
from transformers import AutoModelForCausalLM

base = AutoModelForCausalLM.from_pretrained("Qwen/Qwen3-4B-Instruct-2507")
model = PeftModel.from_pretrained(base, "Tegh25/satellite-anomaly-reporter-qwen3-4b-lora")
```

Prompt format, system message, and a full greedy-decoding example are on the [model card](https://huggingface.co/Tegh25/satellite-anomaly-reporter-qwen3-4b-lora).

---

## How it was built

1. **Data** — OPSSAT-AD: 2,123 segments from ESA’s OPS-SAT, ~20% anomalous, each as 15 engineered features.
2. **Teacher** — Claude Sonnet 5 wrote one report per segment; a quality gate enforced plain prose (no markdown, em dashes, or dataset-statistic language).
3. **Student** — Qwen3-4B Instruct, QLoRA (r=16, α=32), loss on report tokens only, 3 epochs on a Colab T4.
4. **Detector** — Random Forest (`class_weight="balanced"`, 300 trees) on the dataset’s train split.
5. **Demo** — Export held-out generations into JSON; ship a static UI that never invents numbers.

---

## Citation

```
Bogdan, R. (2024). OPSSAT-AD - anomaly detection dataset for satellite telemetry [Dataset].
Ruszczak. https://doi.org/10.5281/zenodo.12588359
```

Adapter licence: Apache 2.0 (matching the base model). Training reports were generated with Claude Sonnet 5.
