import { useMemo } from 'react';
import { copy } from '../copy';
import { useData } from '../data/load';
import { SegmentBanners } from '../components/Banner';
import { DetectorCard } from '../components/DetectorCard';
import { FeatureTable } from '../components/FeatureTable';
import { ReportCard } from '../components/ReportCard';
import { filterAndSort, parseExploreState, serializeExploreState } from '../lib/explore';
import { withQuery } from '../router';
import { NotFound } from './NotFound';

export function SegmentPage({ id, params }: { id: number; params: URLSearchParams }) {
  const { segments, byId, meta } = useData();
  const segment = byId.get(id);
  const st = parseExploreState(params);
  const query = serializeExploreState(st, false);
  const list = useMemo(() => filterAndSort(segments, parseExploreState(new URLSearchParams(query))), [segments, query]);

  if (!segment) return <NotFound what={`Segment ${id}`} />;

  const idx = list.findIndex((s) => s.segment === id);
  const prev = idx > 0 ? list[idx - 1] : undefined;
  const next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : undefined;
  const band = meta.review_band;

  return (
    <article className="segment-page" aria-labelledby="seg-h">
      <nav className="crumbs" aria-label="Segment navigation">
        <a href={`#${withQuery('/', query)}`}>Back to all segments</a>
        {idx >= 0 && (
          <span className="crumbs__pn">
            {prev ? <a href={`#${withQuery(`/segment/${prev.segment}`, query)}`}>Previous: {prev.segment}</a> : <span className="muted">Previous</span>}
            <span className="muted small">{idx + 1} of {list.length}{query ? ' (filtered)' : ''}</span>
            {next ? <a href={`#${withQuery(`/segment/${next.segment}`, query)}`}>Next: {next.segment}</a> : <span className="muted">Next</span>}
          </span>
        )}
      </nav>

      <h1 id="seg-h">Segment <span className="mono">{segment.segment}</span> <span className="muted h-sub">channel <span className="mono">{segment.channel}</span></span></h1>

      <div className="banners">
        <SegmentBanners segment={segment} band={band} />
      </div>

      <div className="segment-grid">
        <div className="segment-grid__side">
          <DetectorCard segment={segment} band={band} />
          <ReportCard key={segment.segment} segment={segment} />
          {segment.compare && (
            <p><a href={`#/compare/${segment.segment}`}>{copy.compareLink}</a></p>
          )}
        </div>
        <div className="segment-grid__evidence">
          <FeatureTable segment={segment} />
        </div>
      </div>
    </article>
  );
}
