import { copy } from '../copy';
import type { Segment } from '../data/types';
import { FEATURES } from '../lib/features';
import { formatValue } from '../lib/format';
import { Tip } from './Tip';

export function FeatureTable({ segment }: { segment: Segment }) {
  return (
    <section className="card" aria-labelledby="evidence-h">
      <h2 id="evidence-h" className="card__title">Evidence</h2>
      <p className="muted">{copy.evidenceNote}</p>
      <table className="features">
        <caption className="sr-only">The 15 engineered features for segment {segment.segment}</caption>
        <thead>
          <tr><th scope="col">Feature</th><th scope="col" className="num-col">Value</th></tr>
        </thead>
        <tbody>
          {FEATURES.map((f) => (
            <tr key={f.key}>
              <th scope="row">
                <span className="features__label">{f.label}</span>
                <Tip text={f.help} label={f.label} />
              </th>
              <td className="mono num-col">{formatValue(segment.features[f.key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
