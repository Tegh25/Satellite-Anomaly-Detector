# Satellite Anomaly Reporter (demo)

A free, static web demo of a fine-tuned Qwen3-4B (LoRA) that writes short mission-ops assessments for flagged satellite telemetry segments from the OPSSAT-AD dataset. A Random Forest flags each segment; the model explains the flag. Every report on the site is a real, precomputed output on held-out test data. There is no live model in this version.

The full product spec is in [`SPEC.md`](SPEC.md).

## Run it

Requires Node 20 or newer.

```bash
cd app
npm install
npm run dev            # real data from public/data/segments.json and meta.json
npm run dev:fixture    # the 17-row dev fixture (segments.dev.json, meta.dev.json)
npm test               # Vitest + React Testing Library
npm run build          # type-check, then write the static site to dist/
npm run preview        # serve dist/ locally
```

## Data

All numbers on screen come from three files in `public/data/`:

| File | What it holds |
|---|---|
| `segments.json` | One entry per test segment: features, detector output, outcome, reports with `number_flags`, and comparison data for the evaluation set. |
| `meta.json` | Review-band thresholds, counts, build info. |
| `results.json` | Evaluation numbers for the Results page. `null` fields render as "Pending". |

The dev fixture (`*.dev.json`) has the same shape and includes rows with `report_source: "teacher_placeholder"`, which show a "DEV PLACEHOLDER" ribbon. The build removes the dev fixture from `dist/`.

### Swapping in new data

1. Run the export in the evaluation notebook (SPEC Appendix A). It writes `segments.json` and `meta.json`.
2. Copy both files over the ones in `public/data/`. No code changes are needed.
3. Fill any remaining `null` values in `results.json` (currently only `review_band.cross_validated`).
4. Run `npm test`. One test checks that every report's `number_flags` lines up with the numbers the tokeniser finds.

Owner details (name, links, dataset citation) live in `src/config.ts`. All interface copy lives in `src/copy.ts`.

## Deploy

### Hugging Face Static Space (primary)

1. Create a Space with the **Static** SDK, for example `Tegh25/satellite-anomaly-reporter`.
2. Add your SSH public key at [huggingface.co/settings/keys](https://huggingface.co/settings/keys) and confirm `ssh -T git@hf.co` works.
3. Run:

   ```bash
   npm run deploy:space -- --space Tegh25/satellite-anomaly-reporter
   ```

   The script builds, clones via SSH (`git@hf.co:spaces/<owner>/<space>`), replaces the Space contents with `dist/` plus `space/README.md`, then commits and pushes. An existing HTTPS clone is rewritten to SSH. Override the clone path with `--dir`; add `--no-push` to inspect the commit first. Hugging Face's own build step is not used.

The Space page on huggingface.co shows the app inside an iframe, so hash routes such as `#/segment/1522` do not appear in the address bar there. Share the app's **direct URL** instead. Find it in the Space's "Embed this Space" dialog; it should look like `https://tegh25-satellite-anomaly-reporter.static.hf.space`.

### GitHub Pages (fallback)

Vite's `base` is `./`, so the same `dist/` works from any subpath. The workflow in `.github/workflows/pages.yml` tests, builds and publishes `app/dist` on every push to `main` that touches `app/`. Enable it once under **Settings > Pages > Source: GitHub Actions**.

## Project layout

```
public/data/      segments.json, meta.json, results.json (+ dev fixture)
src/data/         types.ts, load.ts (fetch once, cache in memory)
src/lib/          numbers.ts (tokeniser), features.ts, format.ts, explore.ts (filter, sort, URL state)
src/components/   DetectorCard, ProbabilityGauge, ReportCard, FeatureTable, Banner, CompareColumns, ResultsTable, ...
src/pages/        Explorer, Segment, Tricky, Compare (list, detail, blind test), Results, About
src/copy.ts       every user-facing string
src/config.ts     owner name, links, dataset citation
scripts/          deploy-space.mjs
space/README.md   Hugging Face Space metadata
```

## Guarantees

- No requests other than same-origin `fetch` of the three data files. No fonts, icons or scripts from CDNs; no cookies, storage or analytics.
- Report text is rendered as plain text, never as markdown or HTML, and never edited.
- Number highlighting uses the precomputed `number_flags`. The browser only locates numbers with the same regex as the Python metric and falls back to plain text if the counts disagree.
