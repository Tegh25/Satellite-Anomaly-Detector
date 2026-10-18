import { useEffect, type ReactNode } from 'react';
import { copy } from '../copy';
import { useData } from '../data/load';
import type { ArmId, JudgePair, ReviewBandRow } from '../data/types';
import { Pending } from '../components/Chips';
import { ArmsTable } from '../components/ResultsTable';

function V({ v, suffix = '' }: { v: number | string | null | undefined; suffix?: string }) {
  return v === null || v === undefined ? <Pending /> : <span className="mono">{v}{suffix}</span>;
}

function Section({ id, title, how, children }: { id: string; title: string; how: string; children: ReactNode }) {
  return (
    <section id={id} className="rsection" aria-labelledby={`${id}-h`}>
      <h2 id={`${id}-h`}>{title}</h2>
      <p className="how"><strong>How to read this:</strong> {how}</p>
      {children}
    </section>
  );
}

const armName = (id: string) => (copy.arms as Record<string, string>)[id] ?? id;

function pairOther(p: JudgePair): ArmId {
  return p.pair === 'finetuned_vs_teacher' ? 'teacher' : 'base_prompted';
}

function BandTable({ rows, caption }: { rows: ReviewBandRow[]; caption: string }) {
  return (
    <div className="table-scroll" role="region" aria-label={caption} tabIndex={0}>
      <table className="results-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr><th scope="col">Review band</th><th scope="col">Segments flagged for review</th><th scope="col">Detector errors caught</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.band.join('-')}>
              <th scope="row" className="mono">{r.band[0]} to {r.band[1]}</th>
              <td className="mono">{r.flagged_pct}%</td>
              <td className="mono">{r.errors_caught} of {r.errors_total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Results({ section }: { section?: string }) {
  const { results: r } = useData();

  useEffect(() => {
    if (section) document.getElementById(section)?.scrollIntoView({ block: 'start' });
  }, [section]);

  const ft = r.arms.find((a) => a.id === 'finetuned');
  const bp = r.arms.find((a) => a.id === 'base_prompted');
  const vsBase = r.judge.pairs.find((p) => p.pair === 'finetuned_vs_base_prompted');
  const vsTeacher = r.judge.pairs.find((p) => p.pair === 'finetuned_vs_teacher');
  const de = r.detector_errors;
  const tl = r.timing_lean;
  const groups = Object.keys(tl.training_reports_pct);

  return (
    <>
      <h1>Results</h1>
      <p className="lede">
        Evaluation set: <V v={r.eval_set.n_segments} /> held-out segments (<V v={r.eval_set.anomalies} /> anomalies,{' '}
        <V v={r.eval_set.nominal} /> nominal), including <V v={r.eval_set.detector_errors_included} /> detector errors.
      </p>
      <p className="muted">{r.eval_set.note}</p>

      <Section id="headline" title="Headline" how="Three numbers that summarise the evaluation. Details for each follow below.">
        <ul className="tiles">
          {ft && bp && (
            <li className="tile">
              <p className="tile__value mono">{ft.format_ok.pct}% <span className="tile__vs">vs</span> {bp.format_ok.pct}%</p>
              <p className="tile__label">Format-compliant reports: this model vs the prompted base</p>
            </li>
          )}
          {[vsBase, vsTeacher].map((p) => p && (
            <li className="tile" key={p.pair}>
              <p className="tile__value mono">{p.wins}&ndash;{p.ties}&ndash;{p.losses}</p>
              <p className="tile__label">
                Judge record against the {pairOther(p) === 'teacher' ? 'teacher' : 'prompted base'} (wins, ties, losses over {p.n} segments)
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="arms" title="Models compared" how="Each cell is the share of reports with that property, with its 95% interval in brackets. The bar shows the interval; the tick marks the point estimate.">
        <ArmsTable arms={r.arms} />
        <ul className="notes">{r.arm_notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </Section>

      <Section id="judge" title="Blind judge" how="A separate model read two reports for the same segment without knowing which model wrote which, and picked the better one.">
        <p className="small">Judge: {r.judge.judge_model}. {r.judge.method}</p>
        <div className="table-scroll" role="region" aria-label="Judge results" tabIndex={0}>
          <table className="results-table">
            <thead>
              <tr>
                <th scope="col">Comparison</th><th scope="col">Wins</th><th scope="col">Ties</th><th scope="col">Losses</th>
                <th scope="col">Unsupported claims per report</th>
              </tr>
            </thead>
            <tbody>
              {r.judge.pairs.map((p) => {
                const other = pairOther(p);
                return (
                  <tr key={p.pair}>
                    <th scope="row">This model vs {armName(other).toLowerCase()} <span className="muted small">(n = {p.n})</span></th>
                    <td className="mono">{p.wins}</td>
                    <td className="mono">{p.ties}</td>
                    <td className="mono">{p.losses}</td>
                    <td>
                      This model <V v={p.unsupported_claims_per_report.finetuned} />, {armName(other).toLowerCase()}{' '}
                      <V v={p.unsupported_claims_per_report[other]} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="banner banner--review banner--inline"><strong>Bias note.</strong>&nbsp;{r.judge.bias_note}</p>
      </Section>

      <Section id="detector-errors" title="Detector errors" how="These are the segments where the Random Forest's flag disagreed with the dataset label. The report is always written for the detector's flag.">
        <dl className="kv">
          <div><dt>Detector errors in the evaluation set</dt><dd><V v={de.n} /></dd></div>
          <div><dt>False alarms</dt><dd><V v={de.false_alarms} /></dd></div>
          <div><dt>Missed anomalies</dt><dd><V v={de.missed_anomalies} /></dd></div>
          <div><dt>Mean detector probability, false alarms</dt><dd><V v={de.mean_detector_probability.false_alarm} /></dd></div>
          <div><dt>Mean detector probability, missed anomalies</dt><dd><V v={de.mean_detector_probability.missed_anomaly} /></dd></div>
        </dl>
        <p>
          The report followed the detector&apos;s flag in <V v={de.report_follows_detector.k} /> of{' '}
          <V v={de.report_follows_detector.n} /> cases.
        </p>
        <p>{de.summary} <a href="#/tricky">Read them in Tricky cases.</a></p>
      </Section>

      <Section id="timing" title="Timing lean" how="Compares how often the last sentence of each report recommends a timing-related check, on the same anomaly segments, for this model and its teacher.">
        <p className="small">{tl.definition}</p>
        <dl className="kv">
          <div><dt>Anomaly segments compared</dt><dd><V v={tl.anomalies_compared} /></dd></div>
          <div><dt>This model recommends a timing check</dt><dd><V v={tl.student_pct} suffix="%" /></dd></div>
          <div><dt>Teacher recommends a timing check</dt><dd><V v={tl.teacher_pct} suffix="%" /></dd></div>
          <div><dt>Only this model did</dt><dd><V v={tl.student_only} /></dd></div>
          <div><dt>Only the teacher did</dt><dd><V v={tl.teacher_only} /></dd></div>
          <div><dt>Sign test p-value</dt><dd><V v={tl.sign_test_p} /></dd></div>
        </dl>
        <div className="table-scroll" role="region" aria-label="Timing lean by group" tabIndex={0}>
          <table className="results-table">
            <thead>
              <tr>
                <th scope="col">Group</th><th scope="col">n</th><th scope="col">Teacher</th><th scope="col">This model</th>
                <th scope="col">Prompted base</th><th scope="col">Training reports</th>
              </tr>
            </thead>
            <tbody>
              {tl.by_group_test.map((g) => (
                <tr key={g.group}>
                  <th scope="row" className="mono">{g.group}</th>
                  <td className="mono">{g.n}</td>
                  <td><V v={g.teacher_pct} suffix="%" /></td>
                  <td><V v={g.finetuned_pct} suffix="%" /></td>
                  <td><V v={g.base_prompted_pct} suffix="%" /></td>
                  <td>{groups.includes(g.group) ? <V v={tl.training_reports_pct[g.group]} suffix="%" /> : <Pending />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>{tl.summary}</p>
      </Section>

      <Section id="review-band" title="Review band" how="Segments whose detector probability falls inside the band are flagged for human review. A wider band catches more detector errors but flags more segments.">
        <BandTable rows={r.review_band.test_split} caption="Review band on the test split" />
        <p className="muted small">{r.review_band.note}</p>
        <h3>Cross-validated</h3>
        {r.review_band.cross_validated ? (
          <BandTable rows={r.review_band.cross_validated} caption="Review band, cross-validated" />
        ) : (
          <p><Pending /></p>
        )}
      </Section>

      <Section id="setup" title="Training and setup" how="How the detector and the reporter were built.">
        <h3>Detector</h3>
        <dl className="kv">
          <div><dt>Model</dt><dd>{r.detector.model}</dd></div>
          <div><dt>Test accuracy</dt><dd><V v={r.detector.test_accuracy} /></dd></div>
          <div><dt>Test precision</dt><dd><V v={r.detector.test_precision} /></dd></div>
          <div><dt>Test recall</dt><dd><V v={r.detector.test_recall} /></dd></div>
        </dl>
        <h3>Reporter</h3>
        <dl className="kv">
          <div><dt>Base model</dt><dd className="mono">{r.training.base_model}</dd></div>
          <div><dt>Method</dt><dd>{r.training.method}</dd></div>
          <div><dt>Epochs</dt><dd><V v={r.training.epochs} /></dd></div>
          <div><dt>Effective batch size</dt><dd><V v={r.training.effective_batch_size} /></dd></div>
          <div><dt>Learning rate</dt><dd>{r.training.learning_rate}</dd></div>
          <div><dt>Final training loss</dt><dd><V v={r.training.final_train_loss} /></dd></div>
          <div><dt>Final validation loss</dt><dd><V v={r.training.final_validation_loss} /></dd></div>
          <div><dt>Loss computed on</dt><dd>{r.training.loss}</dd></div>
        </dl>
      </Section>
    </>
  );
}
