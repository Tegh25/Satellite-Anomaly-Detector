import { useId, useMemo } from 'react';
import { copy } from '../copy';
import { useData } from '../data/load';
import { PipelineStrip } from '../components/PipelineStrip';
import { SegmentTable } from '../components/SegmentTable';
import { OUTCOME_LABEL } from '../components/Chips';
import {
  DEFAULT_STATE, PAGE_SIZE, filterAndSort, parseExploreState, pickRandom, serializeExploreState, summarise,
  type ExploreState, type SortKey,
} from '../lib/explore';
import { percent } from '../lib/format';
import { navigate, withQuery } from '../router';

export function Explorer({ params }: { params: URLSearchParams }) {
  const { segments } = useData();
  const qs = params.toString();
  const st = useMemo(() => parseExploreState(new URLSearchParams(qs)), [qs]);
  const channels = useMemo(() => [...new Set(segments.map((s) => s.channel))].sort(), [segments]);
  const rows = useMemo(() => filterAndSort(segments, st), [segments, st]);
  const { n, errors, review } = useMemo(() => summarise(segments), [segments]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(st.page, pages);
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const ids = { label: useId(), outcome: useId(), channel: useId(), q: useId() };

  const update = (patch: Partial<ExploreState>) => {
    const next = { ...st, page: 1, ...patch };
    navigate(withQuery('/', serializeExploreState(next)), { replace: true });
  };
  const onSort = (key: SortKey) =>
    update({ sort: key, dir: st.sort === key && st.dir === 'asc' ? 'desc' : 'asc' });
  const goPage = (p: number) => {
    update({ page: p });
    document.getElementById('segments-h')?.scrollIntoView({ block: 'start' });
  };
  const filtered = serializeExploreState(st, false) !== '';

  return (
    <>
      <section className="hero" aria-labelledby="hero-h">
        <h1 id="hero-h">{copy.title}</h1>
        <p className="lede">{copy.subtitle}</p>
        <PipelineStrip />
        <div className="hero__actions">
          <button type="button" className="btn btn--primary" onClick={() => {
            const s = pickRandom(segments);
            if (s) navigate(`/segment/${s.segment}`);
          }}>{copy.buttons.random}</button>
          <button type="button" className="btn" onClick={() => {
            const s = pickRandom(segments.filter((x) => x.outcome !== 'correct'));
            if (s) navigate(`/segment/${s.segment}`);
          }}>{copy.buttons.failure}</button>
        </div>
      </section>

      <section aria-labelledby="segments-h">
        <h2 id="segments-h">All test segments</h2>
        <p className="summary">
          {n} segments, {errors} detector errors, {percent(review, n)}% flagged for review.
        </p>

        <form className="filters" role="search" aria-label="Filter segments" onSubmit={(e) => e.preventDefault()}>
          <div className="field">
            <label htmlFor={ids.label}>Dataset label</label>
            <select id={ids.label} value={st.label} onChange={(e) => update({ label: e.target.value as ExploreState['label'] })}>
              <option value="all">All</option>
              <option value="1">ANOMALY</option>
              <option value="0">NOMINAL</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.outcome}>Outcome</label>
            <select id={ids.outcome} value={st.outcome} onChange={(e) => update({ outcome: e.target.value as ExploreState['outcome'] })}>
              <option value="all">All</option>
              {(Object.keys(OUTCOME_LABEL) as (keyof typeof OUTCOME_LABEL)[]).map((o) => (
                <option key={o} value={o}>{OUTCOME_LABEL[o]}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.channel}>Channel</label>
            <select id={ids.channel} value={st.channel} onChange={(e) => update({ channel: e.target.value })}>
              <option value="all">All</option>
              {channels.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor={ids.q}>Segment number</label>
            <input id={ids.q} type="search" inputMode="numeric" value={st.q} placeholder="e.g. 1522"
              onChange={(e) => update({ q: e.target.value })} />
          </div>
          <label className="toggle field--check">
            <input type="checkbox" checked={st.review} onChange={(e) => update({ review: e.target.checked })} />
            <span>Needs review only</span>
          </label>
          {filtered && (
            <button type="button" className="btn btn--ghost btn--small" onClick={() =>
              navigate(withQuery('/', serializeExploreState({ ...DEFAULT_STATE, sort: st.sort, dir: st.dir })), { replace: true })}>
              Clear filters
            </button>
          )}
        </form>

        <p className="muted small" aria-live="polite">
          {rows.length === n ? `Showing all ${n} segments.` : `${rows.length} of ${n} segments match.`}
        </p>

        {rows.length === 0 ? (
          <div className="empty">
            <p>No segments match these filters.</p>
          </div>
        ) : (
          <>
            <SegmentTable rows={shown} sort={st.sort} dir={st.dir} onSort={onSort} linkQuery={serializeExploreState(st, false)} />
            {pages > 1 && (
              <nav className="pager" aria-label="Pagination">
                <button type="button" className="btn btn--small" disabled={page <= 1} onClick={() => goPage(page - 1)}>Previous</button>
                <span className="small">Page {page} of {pages}</span>
                <button type="button" className="btn btn--small" disabled={page >= pages} onClick={() => goPage(page + 1)}>Next</button>
              </nav>
            )}
          </>
        )}
      </section>
    </>
  );
}
