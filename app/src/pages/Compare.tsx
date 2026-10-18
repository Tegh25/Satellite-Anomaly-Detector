import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { copy } from '../copy';
import { useData } from '../data/load';
import type { Segment } from '../data/types';
import { FlagChip, PlaceholderRibbon } from '../components/Chips';
import { CompareColumns, JudgeResult, finetunedReport } from '../components/CompareColumns';
import { ReportText } from '../components/ReportText';
import { pickRandom } from '../lib/explore';
import { NotFound } from './NotFound';

export function CompareList() {
  const { segments } = useData();
  const rows = useMemo(() => segments.filter((s) => s.compare), [segments]);
  const judged = rows.filter((s) => s.compare && s.compare.judge.length > 0).length;
  return (
    <>
      <h1>Compare models</h1>
      <p className="lede">
        {rows.length} segments from the evaluation set have reports from all three models: this model, the same base model
        prompted by hand, and the teacher. {judged} of them were also scored by a blind judge.
      </p>
      <p><a className="btn btn--primary" href="#/compare/blind">Take the blind test</a></p>
      <div className="table-scroll" role="region" aria-label="Segments with comparisons" tabIndex={0}>
        <table className="seg-table">
          <thead>
            <tr><th scope="col">Segment</th><th scope="col">Channel</th><th scope="col">Dataset label</th><th scope="col">Judged</th></tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.segment}>
                <td><a className="mono seg-link" href={`#/compare/${s.segment}`}>{s.segment}</a></td>
                <td className="mono">{s.channel}</td>
                <td><FlagChip value={s.dataset_label} /></td>
                <td>{s.compare && s.compare.judge.length ? `Yes (${s.compare.judge.length})` : <span className="muted">No</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function CompareDetail({ id }: { id: number }) {
  const { byId } = useData();
  const s = byId.get(id);
  if (!s || !s.compare) return <NotFound what={`A comparison for segment ${id}`} />;
  return (
    <article aria-labelledby="cmp-h">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href="#/compare">All comparisons</a>
        <a href={`#/segment/${s.segment}`}>Segment {s.segment} details</a>
      </nav>
      <h1 id="cmp-h">Segment <span className="mono">{s.segment}</span> across models</h1>
      <p className="muted">
        Every model was given the dataset label (<FlagChip value={s.dataset_label} />) and the same 15 statistics.
        {s.report_source === 'teacher_placeholder' && <> <PlaceholderRibbon /></>}
      </p>
      <CompareColumns segment={s} />
      <section aria-labelledby="judge-h" className="rsection">
        <h2 id="judge-h">Judge</h2>
        {s.compare.judge.length ? (
          s.compare.judge.map((j) => <JudgeResult key={j.vs} judge={j} />)
        ) : (
          <p className="muted">This segment was not in the judged sample.</p>
        )}
      </section>
    </article>
  );
}

// Session tally for the blind test. Kept in React state only; nothing is stored.
interface Tally { finetuned: number; base_prompted: number }
const TallyContext = createContext<[Tally, (t: Tally) => void] | null>(null);

export function TallyProvider({ children }: { children: ReactNode }) {
  const state = useState<Tally>({ finetuned: 0, base_prompted: 0 });
  return <TallyContext.Provider value={state}>{children}</TallyContext.Provider>;
}

type Side = 'finetuned' | 'base_prompted';

function newRound(pool: Segment[], avoid?: number) {
  const choices = pool.length > 1 ? pool.filter((s) => s.segment !== avoid) : pool;
  const s = pickRandom(choices);
  const order: [Side, Side] = Math.random() < 0.5 ? ['finetuned', 'base_prompted'] : ['base_prompted', 'finetuned'];
  return { id: s?.segment, order };
}

export function BlindTest() {
  const { segments, byId } = useData();
  const pool = useMemo(() => segments.filter((s) => s.compare), [segments]);
  const ctx = useContext(TallyContext);
  const localTally = useState<Tally>({ finetuned: 0, base_prompted: 0 });
  const [tally, setTally] = ctx ?? localTally;
  const [round, setRound] = useState(() => newRound(pool));
  const [pick, setPick] = useState<'A' | 'B' | null>(null);

  const s = round.id === undefined ? undefined : byId.get(round.id);
  if (!s || !s.compare) return <NotFound what="A segment for the blind test" />;
  const cmp = s.compare;
  const reportFor = (side: Side) => (side === 'finetuned' ? finetunedReport(s) : cmp.base_prompted);
  const labels = { A: round.order[0], B: round.order[1] } as const;
  const judge = cmp.judge.find((j) => j.vs === 'base_prompted');

  const choose = (k: 'A' | 'B') => {
    if (pick) return;
    setPick(k);
    const side = labels[k];
    setTally({ ...tally, [side]: tally[side] + 1 });
  };
  const next = () => {
    setRound(newRound(pool, s.segment));
    setPick(null);
  };
  const total = tally.finetuned + tally.base_prompted;

  return (
    <article aria-labelledby="blind-h">
      <nav className="crumbs" aria-label="Breadcrumb"><a href="#/compare">All comparisons</a></nav>
      <h1 id="blind-h">Blind test</h1>
      <p className="lede">
        Two reports for segment <span className="mono">{s.segment}</span> (dataset label <FlagChip value={s.dataset_label} />).
        One is from this model and one from the same base model prompted by hand. The order is random.
      </p>
      <h2 className="blind__q">{copy.blind.question}</h2>
      <div className="ccols ccols--two">
        {(['A', 'B'] as const).map((k) => {
          const side = labels[k];
          return (
            <section key={k} className={`card${pick === k ? ' card--picked' : ''}`} aria-labelledby={`blind-${k}`}>
              <div className="card__head">
                <h3 id={`blind-${k}`} className="card__title">
                  Report {k}
                  {pick && <span className="reveal"> ({copy.arms[side]})</span>}
                </h3>
              </div>
              <ReportText report={reportFor(side)} highlight={false} />
              <button type="button" className="btn btn--primary" onClick={() => choose(k)} disabled={pick !== null}
                aria-pressed={pick === k}>
                {pick === k ? `You picked ${k}` : `Pick ${k}`}
              </button>
            </section>
          );
        })}
      </div>

      {pick && (
        <section className="rsection" aria-live="polite" aria-labelledby="reveal-h">
          <h2 id="reveal-h">Reveal</h2>
          <p>
            You picked <strong>{copy.arms[labels[pick]]}</strong>. Report A was {copy.arms[labels.A].toLowerCase()} and
            Report B was {copy.arms[labels.B].toLowerCase()}.
          </p>
          {judge ? <JudgeResult judge={judge} /> : <p className="muted">The blind judge did not score this segment.</p>}
          <p><button type="button" className="btn" onClick={next}>Next pair</button>{' '}
            <a href={`#/compare/${s.segment}`}>See all three models for this segment</a></p>
        </section>
      )}

      <p className="tally small" aria-live="polite">
        This session: {total === 0 ? 'no picks yet.' : `you preferred this model ${tally.finetuned} of ${total} times, the prompted base ${tally.base_prompted} of ${total}.`}
      </p>
    </article>
  );
}
