import { useState } from 'react';
import { copy } from '../copy';
import type { ArmId, CompareArm, Judge, Report, Segment } from '../data/types';
import { CopyButton } from './CopyButton';
import { IconCheck, IconCross } from './Icons';
import { HighlightToggle } from './ReportCard';
import { NumberLegend, ReportText } from './ReportText';

type Metrics = Omit<CompareArm, 'text' | 'number_flags'>;
interface Column { id: ArmId; report: Report; metrics: Metrics }

export function finetunedReport(s: Segment): Report {
  return s.reports.dataset_label ?? s.reports.detector_label;
}

export function countEmDashes(text: string): number {
  return text.split('\u2014').length - 1;
}

export function MetricBadges({ metrics, text }: { metrics: Metrics; text: string }) {
  const dashes = countEmDashes(text);
  return (
    <ul className="badges" aria-label="Metrics">
      <li className={`badge ${metrics.format_ok ? 'badge--ok' : 'badge--bad'}`}>
        {metrics.format_ok ? <IconCheck /> : <IconCross />}
        Format {metrics.format_ok ? 'OK' : 'not OK'}
      </li>
      <li className={`badge ${dashes ? 'badge--bad' : ''}`}>Em dashes: <span className="mono">{dashes}</span></li>
      <li className="badge">Words: <span className="mono">{metrics.words}</span></li>
      <li className={`badge ${metrics.unsupported_numbers.length ? 'badge--warn' : ''}`}>
        Unsupported numbers:{' '}
        <span className="mono">
          {metrics.unsupported_numbers.length ? metrics.unsupported_numbers.join(', ') : 'none'}
        </span>
      </li>
    </ul>
  );
}

export function JudgeResult({ judge }: { judge: Judge }) {
  const vsName = copy.arms[judge.vs];
  const winner = judge.winner === 'tie' ? 'Tie' : copy.arms[judge.winner];
  const claims = Object.entries(judge.unsupported_claims);
  return (
    <div className="judge">
      <p className="judge__vs small muted">This model vs {vsName.toLowerCase()}</p>
      <p>
        <strong>{judge.winner === 'tie' ? 'Judge result: Tie.' : `Judge preferred: ${winner}.`}</strong> {judge.reason}
      </p>
      {claims.length > 0 && (
        <p className="small muted">
          Unsupported claims counted by the judge:{' '}
          {claims.map(([arm, n], i) => (
            <span key={arm}>
              {i > 0 && ', '}
              {(copy.arms as Record<string, string>)[arm] ?? arm} {n === null ? 'Pending' : n}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export function CompareColumns({ segment }: { segment: Segment }) {
  const [active, setActive] = useState<ArmId>('finetuned');
  const [highlight, setHighlight] = useState(true);
  const c = segment.compare;
  if (!c) return null;
  const cols: Column[] = [
    { id: 'finetuned', report: finetunedReport(segment), metrics: c.finetuned },
    { id: 'base_prompted', report: c.base_prompted, metrics: c.base_prompted },
    { id: 'teacher', report: c.teacher, metrics: c.teacher },
  ];

  return (
    <>
      <div className="report__tools">
        <HighlightToggle on={highlight} onChange={setHighlight} />
      </div>
      <div className="ctabs" role="tablist" aria-label="Model">
        {cols.map((col) => (
          <button
            key={col.id}
            type="button"
            role="tab"
            id={`tab-${col.id}`}
            aria-selected={active === col.id}
            aria-controls={`col-${col.id}`}
            onClick={() => setActive(col.id)}
          >
            {copy.arms[col.id]}
          </button>
        ))}
      </div>
      <div className="ccols">
        {cols.map((col) => (
          <section
            key={col.id}
            id={`col-${col.id}`}
            className={`card ccol${active === col.id ? ' is-active' : ''}`}
            aria-labelledby={`h-${col.id}`}
          >
            <div className="card__head">
              <h2 id={`h-${col.id}`} className="card__title">{copy.arms[col.id]}</h2>
              <CopyButton text={col.report.text} label="Copy" />
            </div>
            <MetricBadges metrics={col.metrics} text={col.report.text} />
            <ReportText report={col.report} highlight={highlight} />
          </section>
        ))}
      </div>
      {highlight && <NumberLegend />}
    </>
  );
}
