import { useId, useState } from 'react';
import { copy } from '../copy';
import type { Segment } from '../data/types';
import { PlaceholderRibbon } from './Chips';
import { CopyButton } from './CopyButton';
import { NumberLegend, ReportText } from './ReportText';

export function HighlightToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span>Highlight numbers</span>
    </label>
  );
}

export function ReportCard({ segment }: { segment: Segment }) {
  const [mode, setMode] = useState<'detector' | 'dataset'>('detector');
  const [highlight, setHighlight] = useState(true);
  const counterfactual = segment.reports.dataset_label;
  const report = mode === 'dataset' && counterfactual ? counterfactual : segment.reports.detector_label;
  const placeholder = segment.report_source === 'teacher_placeholder';

  return (
    <section className={`card${placeholder ? ' card--placeholder' : ''}`} aria-labelledby="report-h">
      <div className="card__head">
        <h2 id="report-h" className="card__title">Report</h2>
        {placeholder && <PlaceholderRibbon />}
      </div>

      {counterfactual && (
        <div className="segmented" role="group" aria-label="Which label the model was given">
          <button type="button" aria-pressed={mode === 'detector'} onClick={() => setMode('detector')}>
            {copy.reportModes.detector}
          </button>
          <button type="button" aria-pressed={mode === 'dataset'} onClick={() => setMode('dataset')}>
            {copy.reportModes.dataset}
          </button>
        </div>
      )}

      <div className="report__tools">
        <HighlightToggle on={highlight} onChange={setHighlight} />
        <CopyButton text={report.text} />
      </div>

      <ReportText report={report} highlight={highlight} />

      <p className="report__source small">{placeholder ? copy.placeholderSource : copy.reportSource}</p>
      <p className="report__note small">{copy.reportNote}</p>
      {highlight && <NumberLegend />}
    </section>
  );
}
