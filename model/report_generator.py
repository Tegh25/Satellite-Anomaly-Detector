import argparse
import os
import json
from pathlib import Path

import requests
import pandas as pd
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATASET_PATH = SCRIPT_DIR / "dataset.csv"
OUTPUT_PATH = PROJECT_ROOT / "local" / "reports.jsonl"

load_dotenv(PROJECT_ROOT / ".env")

# Keys and config
BACKBOARD_API_KEY = os.getenv("BACKBOARD_API_KEY")
BACKBOARD_API_URL = "https://app.backboard.io/api"
BACKBOARD_LLM_PROVIDER = "anthropic"
BACKBOARD_MODEL_NAME = "claude-sonnet-5"

ESTIMATED_COST_PER_SEGMENT = 0.007

parser = argparse.ArgumentParser(description="Generate satellite anomaly mission-ops reports.")
parser.add_argument(
    "--limit",
    type=int,
    default=None,
    metavar="N",
    help="Generate at most N uncompleted rows, then exit (default: all remaining).",
)
args = parser.parse_args()
if args.limit is not None and args.limit < 1:
    parser.error("--limit must be a positive integer")

df = pd.read_csv(DATASET_PATH)

test_df = df[df["train"] == 0]
train_pool = df[df["train"] == 1]

# Carve validation out of the train pool only, stratify so the ~20% anomaly rate
# is preserved in both slices, not skewed by chance
train_df, val_df = train_test_split(
    train_pool, test_size=0.15, stratify=train_pool["anomaly"], random_state=42
)

print(len(df), len(train_df), len(val_df), len(test_df))

def load_completed_ids(path):
    completed = set()
    if os.path.exists(path):
        with open(path, 'r') as f:
            for line in f:
                completed.add(json.loads(line)['segment'])
    return completed

def append_result(path, segment_id, report):
    with open(path, 'a') as f:
        f.write(json.dumps({"segment": segment_id, "report": report}) + "\n")

completed_ids = load_completed_ids(OUTPUT_PATH)
print(f"Already done: {len(completed_ids)} rows")

if not BACKBOARD_API_KEY:
    raise ValueError(
        "Set BACKBOARD_API_KEY in .env or your environment before running this script."
    )

OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

feature_cols = [
    "mean", "var", "std", "kurtosis", "skew",
    "n_peaks", "smooth10_n_peaks", "smooth20_n_peaks",
    "diff_peaks", "diff2_peaks", "diff_var", "diff2_var",
    "gaps_squared", "var_div_duration", "var_div_len",
]

# Compute reference statistics from train_df
reference_stats = train_df[feature_cols].describe(percentiles=[0.5, 0.9]).loc[["50%", "90%", "max"]]

def format_reference_line(col):
    return f"{col}: median={reference_stats.loc['50%', col]:.4g}, 90th pct={reference_stats.loc['90%', col]:.4g}, max={reference_stats.loc['max', col]:.4g}"

reference_block = "\n".join(format_reference_line(c) for c in feature_cols)

def generate_report(row):
    prompt = f"""You are a spacecraft operations engineer reviewing a flagged telemetry segment.
Note: these are pre-computed statistical features of the segment, not raw sensor values —
reason about what they imply rather than treating them as physical readings.

For internal calibration only — DO NOT mention these numbers, percentiles, or "the dataset" in your
final report. Use them only to judge whether a statistic for this segment is genuinely unusual:
{reference_block}

Write the report as a standalone assessment of this segment, in the same plain language a mission-ops
engineer would use looking at one live reading with no visibility into a historical dataset. Do not
reference medians, percentiles, "typical values," or any dataset-level comparison directly — describe
what's unusual in physical/operational terms instead (e.g. "unusually high for this channel," not
"90th-percentile value").

Channel: {row['channel']}
Segment length: {row['len']} samples over {row['duration']} time units
Mean: {row['mean']:.6g}, Std dev: {row['std']:.6g}, Variance: {row['var']:.6g}
Kurtosis: {row['kurtosis']:.3f}, Skew: {row['skew']:.3f}  (distribution shape — spiky/flat, lopsided/symmetric)
Peak count (raw / smoothed-10 / smoothed-20): {row['n_peaks']} / {row['smooth10_n_peaks']} / {row['smooth20_n_peaks']}
Derivative peak count (1st / 2nd diff): {row['diff_peaks']} / {row['diff2_peaks']}
Derivative variance (1st / 2nd diff): {row['diff_var']:.6g} / {row['diff2_var']:.6g}
Sampling gap irregularity: {row['gaps_squared']}
Label: {"ANOMALY" if row['anomaly'] == 1 else "NOMINAL"}

First, identify which of the provided statistics are actually the most unusual or informative
for THIS segment specifically, do not default to any one feature (e.g. sampling gap irregularity)
unless it is genuinely the standout signal here. Different segments may be explained by different
features: distribution shape, peak structure, derivative behavior, or sampling irregularity can each
be the dominant story depending on the row.

Write a concise mission-ops report (3-4 sentences) covering:
- Which specific statistic(s) actually drive your assessment for this segment, and why
- The likely cause, reasoned from those specific statistics (not a generic category)
- Suggested next step for the ops team, specific to that likely cause

(Remember: describe what's unusual in plain operational terms, with no mention of percentiles,
medians, or dataset-level comparisons.)

If NOMINAL, write a brief confirmation grounded in the specific statistics, not a generic template.

Respond with plain prose only, no headers or markdown formatting. No em dashes."""

    response = requests.post(
        f"{BACKBOARD_API_URL}/threads/messages",
        headers={"X-API-Key": BACKBOARD_API_KEY},
        json={
            "content": prompt,
            "llm_provider": BACKBOARD_LLM_PROVIDER,
            "model_name": BACKBOARD_MODEL_NAME,
            "stream": False,
            "memory": "off",
            "system_prompt": "You are a spacecraft operations engineer. Provide concise, evidence-based assessments for telemetry anomalies.",
        },
        timeout=120,
    )
    response.raise_for_status()
    payload = response.json()
    print(
        "input_tokens", payload.get("input_tokens"),
        "output_tokens", payload.get("output_tokens"),
        "total_tokens", payload.get("total_tokens"),
    )

    return payload.get("content") or payload.get("message") or ""

done_count = len(completed_ids)
total = len(df)
generated_this_run = 0

if args.limit is not None:
    print(f"Limit: generating up to {args.limit} uncompleted row(s) this run")

for _, row in df.iterrows():
    if row['segment'] in completed_ids:
        continue  # skip rows already generated on a prior run
    try:
        report = generate_report(row)
        append_result(OUTPUT_PATH, row['segment'], report)
        completed_ids.add(row['segment'])
        done_count += 1
        generated_this_run += 1
        print(f"Done: {done_count}/{total} — est. cost so far: ${done_count * ESTIMATED_COST_PER_SEGMENT:.2f}")
    except Exception as e:
        print(f"Row {row['segment']} failed: {e}")
        continue  # move on instead of crashing the whole loop

    if args.limit is not None and generated_this_run >= args.limit:
        print(f"Reached --limit {args.limit}; stopping.")
        break