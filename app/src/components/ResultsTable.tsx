import type { Rate, ResultsArm } from '../data/types';

type RateKey = { [K in keyof ResultsArm]: ResultsArm[K] extends Rate ? K : never }[keyof ResultsArm];
type NumKey = 'mean_words' | 'numbers_per_report';

const RATE_ROWS: { key: RateKey; label: string }[] = [
  { key: 'format_ok', label: 'Format-compliant (no markdown, em dashes, dataset language, or truncation)' },
  { key: 'em_dash', label: 'Reports using em dashes' },
  { key: 'markdown', label: 'Reports using markdown' },
  { key: 'dataset_language', label: 'Reports using dataset-statistic language' },
  { key: 'truncated', label: 'Truncated reports' },
  { key: 'any_unsupported_number', label: 'Reports with at least one number not found in the input' },
  { key: 'verdict_anomaly_on_anomalies', label: 'Verdict ANOMALY on anomalies' },
  { key: 'verdict_nominal_on_nominals', label: 'Verdict NOMINAL on nominal segments' },
];

const NUM_ROWS: { key: NumKey; label: string }[] = [
  { key: 'mean_words', label: 'Mean words' },
  { key: 'numbers_per_report', label: 'Numbers per report' },
];

export function IntervalBar({ rate }: { rate: Rate }) {
  return (
    <svg className="ibar" viewBox="0 0 100 10" aria-hidden="true" preserveAspectRatio="none">
      <rect x="0" y="4" width="100" height="2" className="ibar__track" />
      <rect x={rate.lo} y="2" width={Math.max(rate.hi - rate.lo, 0.8)} height="6" className="ibar__ci" />
      <rect x={Math.min(Math.max(rate.pct - 1, 0), 98)} y="0" width="2" height="10" className="ibar__pt" />
    </svg>
  );
}

export function rateText(r: Rate): string {
  return `${r.pct}% [${r.lo} to ${r.hi}]`;
}

export function ArmsTable({ arms }: { arms: ResultsArm[] }) {
  return (
    <div className="table-scroll" role="region" aria-label="Metrics by model" tabIndex={0}>
      <table className="results-table">
        <thead>
          <tr>
            <th scope="col">Metric</th>
            {arms.map((a) => <th key={a.id} scope="col">{a.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {RATE_ROWS.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {arms.map((a) => (
                <td key={a.id}>
                  <span className="mono">{rateText(a[row.key])}</span>
                  <IntervalBar rate={a[row.key]} />
                </td>
              ))}
            </tr>
          ))}
          {NUM_ROWS.map((row) => (
            <tr key={row.key}>
              <th scope="row">{row.label}</th>
              {arms.map((a) => <td key={a.id} className="mono">{a[row.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
