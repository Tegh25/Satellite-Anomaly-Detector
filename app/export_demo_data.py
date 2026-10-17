"""Build the demo's data files from the objects in evaluation notebook.

Run at the bottom of the evaluation notebook, in the same runtime (model loaded, DRY_RUN = False).
It reuses the reports already generated, generates the missing ones with the fine-tuned model
(about 370 segments, roughly the time the evaluation generation took), and writes:

    segments.json   one entry per test segment (see SPEC.md section 5)
    meta.json       build info and the review-band thresholds

See SPEC.md, Appendix A, for the three lines that call this script.
"""
import json
import math
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

FEATURES = ['len', 'duration', 'mean', 'std', 'var', 'kurtosis', 'skew', 'n_peaks', 'smooth10_n_peaks',
            'smooth20_n_peaks', 'diff_peaks', 'diff2_peaks', 'diff_var', 'diff2_var', 'gaps_squared']
BAND_DEFAULT = (0.1, 0.9)   # detector probabilities inside this band are flagged "needs review"

# Number check, identical to the evaluation notebook. The browser never re-implements this: each report
# ships with number_flags, one 0/1 per number found by NUM_RE, in order (1 = the number is in the model's input).
NUM_RE = re.compile(r'(?<![\w.])[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?(?!\w)')


def _is_int_str(s):
    return re.fullmatch(r'[-+]?\d+', s) is not None


def _prompt_numbers(user_msg):
    body = '\n'.join(l for l in user_msg.splitlines() if not l.startswith(('Channel:', 'Label:')))
    return set(NUM_RE.findall(body))


def _sig_digits(s):
    mant = re.split(r'[eE]', s.lstrip('+-'))[0]
    return max(len(mant.replace('.', '').lstrip('0')), 1)


def _is_supported(num, pnums):
    if num in pnums:
        return True
    x = float(num)
    k = _sig_digits(num)
    for q in pnums:
        z = float(q)
        if _is_int_str(num) and _is_int_str(q):
            if x == z:
                return True
        elif not _is_int_str(num):
            if math.isclose(x, z, rel_tol=0.03) or (z != 0 and float(f'{z:.{k - 1}e}') == x):
                return True
    return False


def number_flags(text, user_msg):
    pn = _prompt_numbers(user_msg)
    return [1 if _is_supported(n, pn) else 0 for n in NUM_RE.findall(text)]


def build_user_message(row, label):
    """Must match the training prompt exactly. A parity check below enforces it."""
    return (
        f"Channel: {row['channel']}\n"
        f"Segment length: {row['len']} samples over {row['duration']} time units\n"
        f"Mean: {row['mean']:.6g}, Std dev: {row['std']:.6g}, Variance: {row['var']:.6g}\n"
        f"Kurtosis: {row['kurtosis']:.3f}, Skew: {row['skew']:.3f}\n"
        f"Peak count (raw / smoothed-10 / smoothed-20): {row['n_peaks']} / {row['smooth10_n_peaks']} / {row['smooth20_n_peaks']}\n"
        f"Derivative peak count (1st / 2nd diff): {row['diff_peaks']} / {row['diff2_peaks']}\n"
        f"Derivative variance (1st / 2nd diff): {row['diff_var']:.6g} / {row['diff2_var']:.6g}\n"
        f"Sampling gap irregularity: {row['gaps_squared']}\n"
        f"Label: {'ANOMALY' if int(label) == 1 else 'NOMINAL'}"
    )


def _num(v):
    v = float(v)
    return int(v) if v.is_integer() else v


def build_demo_data(test_all, ev, scored, judged, cache, generate_fn, out_dir, system_prompt,
                    band=BAND_DEFAULT, batch=8, cache_path=None, log=print):
    """
    test_all     DataFrame, all test rows, with dataset columns plus rf_pred and rf_proba
    ev           DataFrame with 'segment' and 'user' (the prompts used in evaluation), for the parity check
    scored       the evaluation notebook's scored DataFrame (arms, texts, metrics)
    judged       the judge cache dict from the evaluation notebook
    cache        dict of cached fine-tuned generations, keyed 'segment|finetuned|true' or '...|rf'
    generate_fn  function(list of message lists) -> list of report strings, using the fine-tuned model
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    rows = test_all.sort_values('segment').reset_index(drop=True).to_dict('records')

    # 1. Rebuilt prompts must match the ones used in training and evaluation, character for character.
    ev_user = dict(zip(ev['segment'], ev['user']))
    checked = 0
    for r in rows:
        if r['segment'] in ev_user:
            assert build_user_message(r, int(r['anomaly'])) == ev_user[r['segment']], \
                f"prompt mismatch for segment {r['segment']}; do not generate until this is fixed"
            checked += 1
    log(f'prompt parity check passed on {checked} segments')

    # 2. Work out which reports are missing. The label in the prompt is the dataset label ('true')
    #    or the detector's wrong flag ('rf'), the same convention the evaluation notebook used.
    def key_for(r, label):
        return f"{int(r['segment'])}|finetuned|{'true' if int(label) == int(r['anomaly']) else 'rf'}"

    todo = []
    for r in rows:
        for label in {int(r['rf_pred']), int(r['anomaly'])}:
            k = key_for(r, label)
            if k not in cache:
                todo.append((k, r, label))
    todo.sort(key=lambda t: len(build_user_message(t[1], t[2])))
    log(f'{len(cache)} reports cached, {len(todo)} to generate')

    for i in range(0, len(todo), batch):
        chunk = todo[i:i + batch]
        msgs = [[{'role': 'system', 'content': system_prompt},
                 {'role': 'user', 'content': build_user_message(r, label)}] for _, r, label in chunk]
        texts = generate_fn(msgs)
        assert len(texts) == len(chunk)
        for (k, r, label), t in zip(chunk, texts):
            rec = {'key': k, 'segment': int(r['segment']), 'arm': 'finetuned', 'label_mode': k.split('|')[2],
                   'text': t.strip(), 'truncated': False}
            cache[k] = rec
            if cache_path:
                with open(cache_path, 'a', encoding='utf-8') as f:
                    f.write(json.dumps(rec, ensure_ascii=False) + '\n')
        log(f'  generated {min(i + batch, len(todo))}/{len(todo)}')

    # 3. Judge results and comparison metrics, from the evaluation run.
    main = scored[scored['label_mode'] == 'true']

    def arm_row(seg, arm):
        s = main[(main['segment'] == seg) & (main['arm'] == arm)]
        return None if s.empty else s.iloc[0]

    def metrics(s):
        return {'format_ok': bool(s['format_ok']), 'em_dash': bool(s['em_dash']), 'words': int(s['words']),
                'unsupported_numbers': [str(x) for x in s['unsupported']]}

    judge_by_seg = {}
    for rec in judged.values():
        a, b = rec['a_arm'], rec['b_arm']
        winner = a if rec['winner'] == 'A' else (b if rec['winner'] == 'B' else 'tie')
        judge_by_seg.setdefault(int(rec['segment']), []).append({
            'vs': b if a == 'finetuned' else a,
            'winner': winner,
            'reason': rec.get('reason', ''),
            'unsupported_claims': {a: rec.get('unsupported_a'), b: rec.get('unsupported_b')},
        })

    # 4. Assemble.
    segments = []
    for r in rows:
        seg, a, p = int(r['segment']), int(r['anomaly']), int(r['rf_pred'])
        proba = float(r['rf_proba'])
        outcome = 'correct' if p == a else ('false_alarm' if p == 1 else 'missed_anomaly')
        user_msg = build_user_message(r, a)      # the numbers in the prompt do not depend on the label

        def report(label):
            t = cache[key_for(r, label)]['text'].strip()
            return {'text': t, 'number_flags': number_flags(t, user_msg)}

        entry = {
            'segment': seg,
            'channel': r['channel'],
            'features': {k: _num(r[k]) for k in FEATURES},
            'dataset_label': a,
            'detector': {'pred': p, 'proba': round(proba, 4), 'review': band[0] <= proba <= band[1]},
            'outcome': outcome,
            'reports': {
                'detector_label': report(p),
                'dataset_label': report(a) if p != a else None,
            },
            'report_source': 'finetuned_nf4_greedy',
            'compare': None,
        }
        tr, bp, ft = arm_row(seg, 'teacher'), arm_row(seg, 'base_prompted'), arm_row(seg, 'finetuned')
        if tr is not None and bp is not None and ft is not None:
            true_text = cache[key_for(r, a)]['text'].strip()
            assert ft['text'].strip() == true_text, f'cache and evaluation disagree for segment {seg}'
            entry['compare'] = {
                'teacher': {'text': tr['text'].strip(), 'number_flags': number_flags(tr['text'].strip(), user_msg), **metrics(tr)},
                'base_prompted': {'text': bp['text'].strip(), 'number_flags': number_flags(bp['text'].strip(), user_msg), **metrics(bp)},
                'finetuned': metrics(ft),          # its text is reports.dataset_label, or reports.detector_label when they agree
                'judge': judge_by_seg.get(seg, []),
            }
        segments.append(entry)

    counts = Counter(s['outcome'] for s in segments)
    meta = {
        'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'n_segments': len(segments),
        'n_with_comparison': sum(1 for s in segments if s['compare']),
        'n_judged': sum(1 for s in segments if s['compare'] and s['compare']['judge']),
        'outcomes': dict(counts),
        'review_band': {'low': band[0], 'high': band[1]},
        'report_source': 'finetuned_nf4_greedy',
    }
    (out_dir / 'segments.json').write_text(
        json.dumps(segments, ensure_ascii=False, allow_nan=False, separators=(',', ':')), encoding='utf-8')
    (out_dir / 'meta.json').write_text(json.dumps(meta, indent=1), encoding='utf-8')
    size_kb = (out_dir / 'segments.json').stat().st_size / 1024
    log(f'wrote {len(segments)} segments ({size_kb:.0f} KB) to {out_dir}')
    log(f'outcomes: {dict(counts)} | with comparison: {meta["n_with_comparison"]} | judged: {meta["n_judged"]}')
    return segments
