# Satellite Anomaly Reporter: demo product spec

**For:** AI agents (building the app) and the project owner (reviewing it).
**Read all of it before writing code.** Items marked **Decided** are final. Items marked **OPEN** belong to the owner: use the stated default and flag it in your summary.

---

## 0. Ground rules

1. Build **Phase 1** (a static site). **Phase 2** (live generation) is optional and comes last.
2. **Never invent data.** Every number on screen comes from `data/*.json`. If a value is `null`, show a muted "Pending" state, never a zero or a placeholder figure.
3. Start from the dev fixture in `data/` (`segments.dev.json`, `meta.dev.json`, `results.json`). It is shaped exactly like the real data. Rows with `report_source: "teacher_placeholder"` are fake reports: show a visible "DEV PLACEHOLDER" ribbon on them.
4. **Honesty is a feature.** The demo's job is to show a real model, real outputs, real evidence, and real failure modes. Do not hide, soften, or restyle the limitations.
5. The model's text is **plain text**. Do not render it as markdown or HTML, and never edit it.

---

## 1. Product

**What it is.** A free public web demo of a fine-tuned language model (Qwen3-4B with a LoRA adapter) that writes short mission-ops assessments for flagged satellite telemetry segments. It is the second half of a two-stage pipeline:

```
15 engineered features   ->   Random Forest detector   ->   fine-tuned LLM   ->   report
(per telemetry segment)       flag + probability            explains the flag
```

The data is OPSSAT-AD, a spacecraft telemetry anomaly benchmark. Each segment is described by 15 statistics. The model never sees the raw signal.

**Audience.** Recruiters, hiring managers and engineers arriving from a resume or LinkedIn post. They give it about two minutes, often on a phone.

**What a visitor should walk away with**
1. They understand the pipeline in 20 seconds.
2. They have read real model outputs on real held-out data.
3. They have seen honest evidence: an evaluation against baselines, and the model's failure modes.
4. They trust it, because nothing is hidden.

**Non-goals (Phase 1):** accounts, payments, analytics or tracking, uploading data, chat, other satellites, a live model.

---

## 2. Hard constraints (why Phase 1 is static)

- **$0, permanently.** No paid hosting, no paid APIs, no keys or secrets in the client.
- As of Hugging Face's current docs, **Gradio and Docker Spaces need a paid plan to create**, while **Static Spaces are free for everyone** ([Spaces overview](https://huggingface.co/docs/hub/spaces-overview), [Static Spaces](https://huggingface.co/docs/hub/spaces-sdks-static)). Free personal accounts in good standing (verified email, account older than 30 days) may host up to 2 **ZeroGPU** Spaces ([ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu)). This is why Phase 1 is a static site replaying the model's real outputs, and live generation is an optional Phase 2.
- **No external requests at runtime.** Self-host everything (fonts, icons, data). No CDNs, no analytics, no cookies.
- **Decided:** hosting is a Hugging Face Static Space. A GitHub Pages build must also work as a fallback (`base` configurable).

---

## 3. Architecture

```
Colab (done by the owner)        Static site (Phase 1)                         Phase 2 (optional)
evaluation notebook      ->      public/data/segments.json  (529 segments)  -> separate ZeroGPU Gradio Space,
+ export_demo_data.py            public/data/results.json   (evaluation)       linked from the static site
                                 Vite + React + TypeScript, hash routing
                                 hosted on a Hugging Face Static Space
```

**Decided stack**
- Vite, React 18, TypeScript (strict).
- Plain CSS with design tokens as CSS variables. No UI kit, no Tailwind, no chart library (draw gauges and bars as small SVG components).
- Hash routing (`#/segment/1522`), because static hosting has no SPA fallback. Use `HashRouter` or a tiny custom router.
- Tests: Vitest and React Testing Library. A Playwright smoke test is welcome but optional.
- Data is loaded once with `fetch`, cached in memory, with a skeleton state while loading.

**Repo layout**
```
satellite-anomaly-demo/
  public/data/          segments.json, results.json, meta.json
  src/
    data/               types.ts, load.ts
    components/         SegmentTable, DetectorCard, ProbabilityGauge, ReportCard, FeatureTable,
                        Banner, CompareColumns, ResultsTable, ...
    pages/              Explorer, Segment, Tricky, Compare, Results, About
    lib/                numbers.ts (tokenise + highlight), features.ts (labels and help text)
    copy.ts             every user-facing string from section 8
  scripts/deploy-space  copies dist/ and space/README.md into a clone of the Space repo
  space/README.md       the Hugging Face YAML (below)
  SPEC.md  README.md
```

**Deploy (Decided).** The GitHub repo is the source of truth. `npm run build` writes `dist/`. The deploy script copies the **contents** of `dist/` to the **root** of the Space repo along with `space/README.md`, then commits and pushes. Do not rely on Hugging Face's build step. Set Vite `base: './'` so asset URLs are relative.

`space/README.md`:
```yaml
---
title: Satellite Anomaly Reporter
emoji: 🛰️
colorFrom: blue
colorTo: indigo
sdk: static
pinned: false
---
```
The Space page on huggingface.co embeds the app in an iframe, so hash routes will not change the browser's address bar there. Tell the owner to share the app's **direct URL** (shown in the Space's "Embed this Space" dialog; I believe it has the form `https://<owner>-<space>.static.hf.space`, please verify).

---

## 4. Data contract

Files are in `public/data/`. Use the dev files first, then swap in the real `segments.json` and `meta.json` with no code changes.

```ts
export type FeatureKey = 'len' | 'duration' | 'mean' | 'std' | 'var' | 'kurtosis' | 'skew' | 'n_peaks'
  | 'smooth10_n_peaks' | 'smooth20_n_peaks' | 'diff_peaks' | 'diff2_peaks' | 'diff_var' | 'diff2_var' | 'gaps_squared';

export type Outcome = 'correct' | 'false_alarm' | 'missed_anomaly';

export interface Report { text: string; number_flags: (0 | 1)[] }          // see section 7

export interface CompareArm extends Report {
  format_ok: boolean; em_dash: boolean; words: number; unsupported_numbers: string[];
}
export interface Judge {
  vs: 'base_prompted' | 'teacher';
  winner: 'finetuned' | 'base_prompted' | 'teacher' | 'tie';
  reason: string;
  unsupported_claims: Record<string, number | null>;
}
export interface Segment {
  segment: number;
  channel: string;
  features: Record<FeatureKey, number>;
  dataset_label: 0 | 1;                              // ground truth from the dataset: 1 = ANOMALY
  detector: { pred: 0 | 1; proba: number; review: boolean };   // proba = P(anomaly); review = inside the uncertain band
  outcome: Outcome;
  reports: {
    detector_label: Report;                          // what the pipeline writes (prompt label = detector's flag)
    dataset_label: Report | null;                    // only when the detector was wrong: report if given the dataset label
  };
  report_source: 'finetuned_nf4_greedy' | 'teacher_placeholder';
  compare: null | {                                  // only for the ~158 segments in the evaluation set
    teacher: CompareArm;
    base_prompted: CompareArm;
    finetuned: Omit<CompareArm, 'text' | 'number_flags'>;   // its text is reports.dataset_label ?? reports.detector_label
    judge: Judge[];                                  // 0 to 2 entries; only ~60 segments were judged
  };
}
```

`results.json` holds the evaluation numbers (shape in the file). `meta.json` holds `review_band: {low, high}`, counts, and build info. Never hardcode the band thresholds or counts; read them.

**Feature labels** (`src/lib/features.ts`). Show the label, the raw value, and a tooltip.

| Key | Label | Tooltip |
|---|---|---|
| `len` | Samples | Number of samples in the segment. |
| `duration` | Duration | Time span the segment covers, in time units. |
| `mean`, `std`, `var` | Mean, Std dev, Variance | Basic amplitude statistics of the signal. |
| `kurtosis` | Kurtosis | How heavy-tailed or spiky the distribution is. Negative means flat. |
| `skew` | Skew | How lopsided the distribution is. |
| `n_peaks` | Peaks (raw) | Peaks in the raw signal. |
| `smooth10_n_peaks`, `smooth20_n_peaks` | Peaks (smoothed, 10 and 20) | Peaks after smoothing with a 10-sample and 20-sample window. |
| `diff_peaks`, `diff2_peaks` | Peaks in 1st and 2nd difference | Peaks in the sample-to-sample change and in its change. |
| `diff_var`, `diff2_var` | Variance of 1st and 2nd difference | How jumpy the signal is. |
| `gaps_squared` | Sampling gap irregularity | How uneven the sample timing is (the dataset's `gaps_squared` column). |

Format floats with `toPrecision(6)` (strip trailing zeros), integers as-is, in a monospace tabular style.

---

## 5. Screens (Phase 1)

Priority: **P0** must ship, **P1** should ship, **P2** if time allows.

**Global.** Header with the title and nav: Explore, Tricky cases, Compare, Results, About. A persistent pill: "Precomputed on held-out test data. No live model in this version." Footer with links (GitHub, model card, write-up, dataset), the teacher disclosure, and the owner's name (all **OPEN** values live in one config object).

### 5.1 Explore (home) (P0)
- Hero: title, subtitle, the three-step pipeline strip, and two buttons: **Random segment** and **Show me a failure** (random segment whose outcome is not `correct`).
- Below it, a table of all segments. Columns: Segment, Channel, Dataset label, Detector (flag plus a small probability bar), Outcome, Review.
- Filters: dataset label, outcome, channel, "Needs review only", search by segment number. Sort by any column. 25 rows per page.
- Summary line computed from data: "{n} segments, {k} detector errors, {p}% flagged for review."
- Row click goes to `#/segment/:id`.
- Acceptance: renders 529 rows without jank; keyboard operable (rows are links); empty state; filters combine.

### 5.2 Segment page (P0)
Desktop: two columns. Left is **Evidence**. Right is the **Detector card** above the **Report card**. Mobile is a single column ordered Detector, Report, Evidence.

- **Detector card:** flag chip (ANOMALY or NOMINAL), a probability gauge from 0 to 1 with the review band shaded and a tick at 0.5, the text "Detector probability of anomaly: 0.62", the **dataset label** chip ("Ground truth from OPSSAT-AD"), and an outcome chip.
- **Banners** (section 8): shown for `missed_anomaly`, `false_alarm`, and `detector.review === true`. Both kinds can show at once.
- **Report card:** the report text with number highlighting (section 7), a legend, a copy button, and the source line "Precomputed with the fine-tuned model, greedy decoding, held-out test data". When `reports.dataset_label` exists, show a segmented control: **Given the detector's flag (what the pipeline does)** (default) and **Given the dataset label (counterfactual)**.
- **Evidence panel:** the 15 features with labels, raw values and tooltips, plus the note "These 15 statistics are everything the model sees."
- If `compare` exists, a link: "Compare this segment across models".
- Acceptance: all outcome and review states render correctly for the dev fixture; the URL is deep-linkable; copy returns the plain text only.

### 5.3 Tricky cases (P0)
A gallery of every segment whose outcome is not `correct`, grouped as Missed anomalies and False alarms. Each card shows the outcome chip, segment, channel, detector probability, and the first 180 characters of the report. An intro paragraph states the limitation (section 8) and links to the Results section on detector errors.

### 5.4 Results (P0)
Renders `results.json`. Sections, each with a one-line "How to read this":
1. **Headline:** three stat tiles built from the data (format compliance of this model vs the prompted base; the judge record against the prompted base; the judge record against the teacher).
2. **Arms table:** teacher, this model, prompted base, with every metric and its 95% interval (render intervals as text; interval bars are P1).
3. **Judge:** wins, ties, losses per pair, unsupported claims per report, and the bias note.
4. **Detector errors:** counts, and "the report followed the detector's flag in {k} of {n} cases".
5. **Timing lean:** the sign-test result and the by-group table.
6. **Review band:** the table, showing the pending cross-validated result as "Pending".
7. **Training and setup.**
Acceptance: every number matches `results.json` exactly; no figures hardcoded in components; `null` renders as "Pending".

### 5.5 Compare (P1)
List the segments that have `compare`. The compare page shows three columns (This model, Prompted base, Teacher), each with the report (highlighted per section 7) and metric badges: Format OK, em dash count, words, unsupported numbers. Below them, the judge result when present ("Judge preferred: This model. {reason}"). On mobile use tabs.

**Blind test (P1):** pick a random segment that has `compare`. Show the fine-tuned report and the prompted-base report as A and B in random order, with no labels. The visitor picks "Which would you rather hand to an ops team?". Then reveal which was which, the judge's pick and reason if present, and update a session tally. Keep everything in React state; store nothing.

### 5.6 About and limitations (P0)
Copy in section 8: what this is, how it was built, what the evidence says, limitations, credits and the teacher disclosure.

### 5.7 Stretch (P2)
Dark mode toggle (system preference by default), filters stored in the hash, previous and next segment within the current filter, interval bars on the Results page.

---

## 6. Design guidance

- **Direction:** calm mission-control. Dense but legible, restrained palette, one accent colour. Not a neon dashboard.
- **Type:** system font stack, or one self-hosted woff2 of 60 KB or less. Feature values in a monospace face with tabular numerals. Reports at 16 to 18px, line height 1.6, at most about 70 characters wide.
- **Meaning is never colour alone.** Every chip has text and an icon or shape. ANOMALY and NOMINAL look different by shape and label, not only hue.
- **Accessibility:** WCAG AA contrast, visible focus rings, full keyboard operation, `prefers-reduced-motion` respected, the gauge exposed with a text alternative, tooltips reachable by keyboard.
- **Responsive:** works from 360px wide with no horizontal page scroll (only the data table may scroll inside its container).
- **Performance targets:** initial JS 200 KB gzipped or less, data 1.5 MB gzipped or less, Lighthouse mobile 90 or higher for performance, accessibility and best practices.
- **Tone of the UI:** direct, specific, no marketing language, no emoji in the interface.

---

## 7. Number highlighting (client)

Every report ships with `number_flags`: one 0 or 1 per number the Python metric found in the text, in order (1 means the number appears in the model's input, 0 means it does not). **The browser never decides which numbers are supported.** It only finds the numbers and zips them with the flags.

Tokeniser (must match exactly; vectors in `data/number_extraction_vectors.json`):
```js
const NUM_RE = /(?<![\w.])[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?(?!\w)/g;
```
Algorithm: iterate `text.matchAll(NUM_RE)`; the i-th match gets `number_flags[i]`. Flag 1 gets a subtle underline and tooltip "Appears in the model's input". Flag 0 gets a dotted amber outline and the tooltip "Not found in the model's input. It may be a derived value, such as a ratio." If the match count differs from `number_flags.length`, render the plain text and `console.warn` in development. A "Highlight numbers" toggle is on by default. Write unit tests that run the tokeniser over the vectors.

---

## 8. Copy deck (use verbatim; it lives in `src/copy.ts`)

- **Title:** Satellite Anomaly Reporter
- **Subtitle:** A small language model, fine-tuned to explain flagged spacecraft telemetry the way a mission-ops engineer would.
- **Pill:** Precomputed on held-out test data. No live model in this version.
- **Pipeline steps:**
  1. *15 statistics.* Each telemetry segment is summarised by 15 engineered features. The model never sees the raw signal.
  2. *Detector.* A Random Forest flags the segment ANOMALY or NOMINAL and gives a probability.
  3. *Reporter.* A fine-tuned Qwen3-4B writes a short mission-ops assessment of that flag.
- **Buttons:** Random segment. Show me a failure.
- **Banner, missed anomaly.** Title: *The detector missed this anomaly.* Body: The dataset labels this segment ANOMALY, but the detector said NOMINAL. The report below explains the detector's flag, so it describes a normal-looking segment and recommends no action. This is the model's main limitation: it explains whatever flag it is given.
- **Banner, false alarm.** Title: *The detector raised a false alarm.* Body: The dataset labels this segment NOMINAL, but the detector said ANOMALY. The report below explains the detector's flag, so it may offer a physical story that the features do not establish.
- **Banner, low confidence.** Title: *Low-confidence detection.* Body: The detector's probability ({p}) is in the uncertain range ({low} to {high}). Treat the report as an explanation of the flag, not a confirmation of it.
- **Report card note:** Plausible narrative, not a verified diagnosis. The dataset has no ground-truth causes, so the stated cause cannot be checked.
- **Number legend:** Underlined: the number appears in the model's input. Dotted outline: not found in the input (it may be a derived value such as a ratio).
- **Tricky cases intro:** The detector is wrong on a small share of segments. In every one of those cases the model explained the detector's flag rather than questioning it. These are the cases to read closely.
- **About, what this is:** A portfolio project that fine-tunes a 4-billion-parameter open model to turn flagged spacecraft telemetry into short mission-ops reports. It is not an operational tool.
- **About, how it was built:** A Random Forest detector flags segments. A larger model (Claude Sonnet 5) wrote one report per training segment. The small model was fine-tuned on those reports with QLoRA, learning only to write the report, not to reproduce the input numbers.
- **About, what the evidence says:** On held-out segments the fine-tuned model matches its teacher on format and number faithfulness, is rated at parity with the teacher by a blind judge, and clearly beats the same base model prompted by hand. See Results.
- **About, limitations (all of these, as a list):**
  - It trusts the label it is given and follows the detector even when the detector is wrong.
  - Its stated causes are plausible narratives; the dataset has no ground-truth causes.
  - It recommends a timing-focused next step more often than its teacher does.
  - It inherits its teacher's flaws.
  - One dataset, features instead of raw signals, English only, a small evaluation sample.
  - The judge is the same model family as the teacher, so it likely favours the teacher's style.
- **Credits:** Dataset: OPSSAT-AD (**OPEN:** citation and licence from the dataset page). Base model: Qwen3-4B-Instruct-2507 (Apache 2.0). Teacher reports: Claude Sonnet 5.
- **Footer:** Built by Teghveer Singh Ateliey. Links: GitHub, model card, write-up (**OPEN**).

---

## 9. Phase 2: live generation on ZeroGPU (optional, last)

Only start this after Phase 1 is deployed. **Do a 30-minute spike first**; if it fails, stop and leave Phase 1 as the product.

**Why it is limited.** It must be a separate Gradio Space on ZeroGPU. The owner's account needs a verified email and to be more than 30 days old. Visitors get **2 GPU minutes per day unauthenticated and 5 minutes with a free Hugging Face account** ([ZeroGPU docs](https://huggingface.co/docs/hub/spaces-zerogpu)). Generation time on ZeroGPU is unmeasured; if a report takes about 10 seconds, that is roughly 12 reports per anonymous visitor per day. Say so in the UI.

**Spike**
1. Create the Space (Gradio SDK, ZeroGPU hardware, Python 3.12, PyTorch 2.8 or newer).
2. Load the base model in fp16 at module level, attach the adapter, merge once at startup: `PeftModel.from_pretrained(base, ADAPTER).merge_and_unload()`. Per the docs, models must be moved to `cuda` at module level, not inside the decorated function.
3. One function decorated with `@spaces.GPU(duration=40)` takes the prompt, runs greedy generation (`max_new_tokens=450`) and returns the text.
4. **Quality gate:** the adapter was trained on a 4-bit base, so fp16 outputs can differ slightly. Run 30 segments from `segments.json` and confirm the format metrics still hold (no markdown, no em dashes, not truncated, at least 95% format-compliant). If not, stop.

**Product (if the spike passes).** A "Try your own segment" page: a dropdown of known channels and 15 numeric fields with a "Load an example" selector. The detector runs first (see Appendix B for the pinned-version warning), the review-band banner applies, and the report is generated with the **detector's** flag. An advanced toggle, "Force a label", shows that the model explains whichever label it is given. Validate every field (finite numbers, sane ranges taken from the dataset). **No free-text input ever reaches the model:** the prompt is built server-side from numbers and a channel from a fixed list. When quota runs out, show a clear message and fall back to the precomputed examples. The static site links to this Space (or embeds it with the `<gradio-app>` web component); it must never hold a Hugging Face token.

---

## 10. Definition of done (Phase 1)

- [ ] All P0 screens work on the dev fixture, then on the real `segments.json` with no code changes.
- [ ] Every state is covered by a fixture row or test: correct, false alarm, missed anomaly, review band, compare with and without judge, placeholder ribbon, `null` values.
- [ ] Tokeniser passes the extraction vectors; flag/match count mismatch falls back safely.
- [ ] Results page values match `results.json` exactly; `null` shows "Pending".
- [ ] No network requests other than same-origin; no cookies, storage or analytics.
- [ ] Lighthouse mobile 90 or higher (performance, accessibility, best practices); keyboard-only walkthrough passes; 360px layout has no horizontal scroll.
- [ ] `npm run build` output deploys to a Hugging Face Static Space and the direct URL works end to end; the GitHub Pages fallback also builds.
- [ ] README covers: what it is, how to run, how to swap in real data, how to deploy.

## 11. Milestones

1. **M0** Scaffold, types, data loader, routing, theme tokens, `copy.ts`.
2. **M1** Explorer with filters, sort, pagination.
3. **M2** Segment page: detector card, gauge, banners, evidence panel, report card with highlighting.
4. **M3** Tricky cases, Results, About.
5. **M4** Compare and blind test.
6. **M5** Accessibility, performance, responsive pass, tests.
7. **M6** Deploy to the Static Space; verify the direct URL.
8. **M7** (optional) Phase 2 spike and, if it passes, the live page.

## 12. Open items for the owner

- Hugging Face username and Space name; GitHub, model-card and write-up URLs; `Teghveer Singh Ateliey`.
- Dataset citation and licence.
- Detector test accuracy, precision and recall; the cross-validated review-band result; both are `null` in `results.json` until filled.
- Final review-band thresholds (default 0.1 and 0.9).
- Run the data export (Appendix A) and replace the dev files.

Hugging Face model URL: https://huggingface.co/Tegh25/satellite-anomaly-reporter-qwen3-4b-lora
Hugging Face username: Tegh25
GitHub repo: https://github.com/Tegh25/Satellite-Anomaly-Detector
GitHub username: Tegh25
Dataset: https://zenodo.org/records/12588359
Metrics, results, and dataset citation/license can be found in `local\MODEL_CARD.md`

---

## Appendix A: generating the real data (owner, in Colab)

Run this at the bottom of the **evaluation notebook**, in a runtime where the model is loaded and the evaluation cells have run with `DRY_RUN = False` (the generation and judge cells finish instantly because everything is cached; the judge cell makes no new API calls). Upload `export_demo_data.py` to `/content` first.

```python
import sys, importlib, json
sys.path.insert(0, '/content')
import export_demo_data as E
importlib.reload(E)

DEMO_DIR = FT_DIR / 'demo_data'
demo_cache_file = EVAL_DIR / 'demo_generations.jsonl'
cache = dict(done)                                   # reports the evaluation already generated
if demo_cache_file.exists():                         # resume after a disconnect
    for line in open(demo_cache_file, encoding='utf-8'):
        if line.strip():
            rec = json.loads(line); cache[rec['key']] = rec

segments = E.build_demo_data(
    test_all=test_all, ev=ev, scored=scored, judged=judged, cache=cache,
    generate_fn=lambda msgs: generate_batch(msgs, adapter_on=True)[0],
    out_dir=DEMO_DIR, system_prompt=ev['system'].iloc[0], cache_path=demo_cache_file)
```

It first checks that every rebuilt prompt matches the training prompt character for character (and stops if not), reuses the reports you already have, generates only the missing ones (about 370 segments, at roughly the speed of the evaluation run), and writes `segments.json` and `meta.json` to `finetune/demo_data/` on Drive. Copy both to `public/data/`. Then fill the `null` fields in `results.json`.

## Appendix B: exact prompt (Phase 2 only)

System prompt:
```
You are a spacecraft operations engineer. You receive pre-computed statistical features of one flagged telemetry segment (not raw sensor values) plus its label. Write a concise, evidence-based mission-ops assessment in plain prose: which statistics drive your assessment, the likely cause, and the next step for the ops team.
```
User message: build it with `build_user_message(row, label)` in `export_demo_data.py`. It must match training exactly (`.6g` formatting for mean, std, variance and derivative variances; `.3f` for kurtosis and skew). Compute `number_flags` for live reports with the same module (`number_flags(text, user_msg)`), so live and precomputed reports highlight identically.

**Detector warning.** `rf_detector.joblib` was saved under scikit-learn 1.9.1. Loading it under a different version warns and may misbehave. In the Phase 2 Space either pin `scikit-learn` to the version that saved it, or refit from `dataset.csv` (300 trees, `class_weight="balanced"`, `random_state=42`, 15 features, trained on the `train == 1` rows). Pin `transformers==5.18.0` and `peft==0.21.1`, the versions the adapter was trained with.
