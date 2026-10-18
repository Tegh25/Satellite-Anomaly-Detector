import { copy } from '../copy';
import { useData } from '../data/load';
import type { Outcome, Segment } from '../data/types';
import { OutcomeChip, PlaceholderRibbon, ReviewChip } from '../components/Chips';
import { formatProba } from '../lib/format';

const EXCERPT = 180;

function excerpt(text: string): string {
  return text.length <= EXCERPT ? text : `${text.slice(0, EXCERPT).trimEnd()}\u2026`;
}

function Card({ s }: { s: Segment }) {
  return (
    <li className="tcard">
      <a href={`#/segment/${s.segment}`} className="tcard__link">
        <span className="tcard__head">
          <OutcomeChip outcome={s.outcome} />
          {s.detector.review && <ReviewChip />}
          {s.report_source === 'teacher_placeholder' && <PlaceholderRibbon />}
        </span>
        <span className="tcard__title">
          Segment <span className="mono">{s.segment}</span>
          <span className="muted"> &middot; <span className="mono">{s.channel}</span></span>
        </span>
        <span className="small">Detector probability of anomaly: <span className="mono">{formatProba(s.detector.proba)}</span></span>
        <span className="tcard__excerpt">{excerpt(s.reports.detector_label.text)}</span>
      </a>
    </li>
  );
}

const GROUPS: { outcome: Outcome; title: string }[] = [
  { outcome: 'missed_anomaly', title: 'Missed anomalies' },
  { outcome: 'false_alarm', title: 'False alarms' },
];

export function Tricky() {
  const { segments } = useData();
  return (
    <>
      <h1>Tricky cases</h1>
      <p className="lede">{copy.trickyIntro}</p>
      <p><a href="#/results/detector-errors">See the Results section on detector errors</a></p>
      {GROUPS.map((g) => {
        const items = segments.filter((s) => s.outcome === g.outcome);
        return (
          <section key={g.outcome} aria-labelledby={`g-${g.outcome}`}>
            <h2 id={`g-${g.outcome}`}>{g.title} <span className="muted">({items.length})</span></h2>
            {items.length ? (
              <ul className="tgrid">{items.map((s) => <Card key={s.segment} s={s} />)}</ul>
            ) : (
              <p className="empty">None in this data.</p>
            )}
          </section>
        );
      })}
    </>
  );
}
