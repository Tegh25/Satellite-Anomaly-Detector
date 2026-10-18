import type { Segment } from '../data/types';
import { formatProba } from '../lib/format';
import { FlagChip, OutcomeChip, ReviewChip } from './Chips';
import { ProbabilityGauge } from './ProbabilityGauge';

export function DetectorCard({ segment, band }: { segment: Segment; band: { low: number; high: number } }) {
  const { pred, proba, review } = segment.detector;
  return (
    <section className="card" aria-labelledby="detector-h">
      <h2 id="detector-h" className="card__title">Detector</h2>
      <div className="detector__row">
        <span className="detector__key">Detector flag</span>
        <FlagChip value={pred} />
        {review && <ReviewChip />}
      </div>
      <ProbabilityGauge proba={proba} low={band.low} high={band.high} />
      <p className="detector__proba">
        Detector probability of anomaly: <strong className="mono">{formatProba(proba)}</strong>
      </p>
      <p className="muted small">Shaded: review band ({band.low} to {band.high}). Tick: 0.5.</p>
      <dl className="detector__facts">
        <div>
          <dt>Dataset label</dt>
          <dd>
            <FlagChip value={segment.dataset_label} />
            <span className="muted small">Ground truth from OPSSAT-AD</span>
          </dd>
        </div>
        <div>
          <dt>Outcome</dt>
          <dd><OutcomeChip outcome={segment.outcome} /></dd>
        </div>
      </dl>
    </section>
  );
}
