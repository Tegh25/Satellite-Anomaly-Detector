import { useId, useMemo } from 'react';
import { copy } from '../copy';
import type { Report } from '../data/types';
import { tokenise } from '../lib/numbers';

/** Renders report text verbatim, as plain text, with optional number highlighting. */
export function ReportText({ report, highlight }: { report: Report; highlight: boolean }) {
  const id = useId();
  const tokens = useMemo(() => tokenise(report.text, report.number_flags), [report]);
  if (!highlight || !tokens) return <p className="report-text">{report.text}</p>;
  return (
    <>
      <p className="report-text">
        {tokens.map((t, i) =>
          t.kind === 'text' ? (
            t.text
          ) : (
            <span
              key={i}
              tabIndex={0}
              className={t.supported ? 'num num--ok' : 'num num--unsupported'}
              aria-describedby={t.supported ? `${id}-ok` : `${id}-no`}
              data-tip={t.supported ? copy.numberTips.supported : copy.numberTips.unsupported}
            >
              {t.text}
            </span>
          ),
        )}
      </p>
      <span hidden id={`${id}-ok`}>{copy.numberTips.supported}</span>
      <span hidden id={`${id}-no`}>{copy.numberTips.unsupported}</span>
    </>
  );
}

export function NumberLegend() {
  return (
    <ul className="legend">
      <li><span className="num num--ok" aria-hidden="true">12</span> {copy.numberLegend.supported}</li>
      <li><span className="num num--unsupported" aria-hidden="true">12</span> {copy.numberLegend.unsupported}</li>
    </ul>
  );
}
