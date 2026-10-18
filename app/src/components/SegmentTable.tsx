import type { Segment } from '../data/types';
import type { SortDir, SortKey } from '../lib/explore';
import { formatProba } from '../lib/format';
import { navigate, withQuery } from '../router';
import { FlagChip, OutcomeChip, PlaceholderRibbon, ReviewChip } from './Chips';
import { ProbabilityBar } from './ProbabilityGauge';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'segment', label: 'Segment' },
  { key: 'channel', label: 'Channel' },
  { key: 'dataset_label', label: 'Dataset label' },
  { key: 'proba', label: 'Detector' },
  { key: 'outcome', label: 'Outcome' },
  { key: 'review', label: 'Review' },
];

interface Props {
  rows: Segment[];
  sort: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  linkQuery: string;
}

export function SegmentTable({ rows, sort, dir, onSort, linkQuery }: Props) {
  return (
    <div className="table-scroll" role="region" aria-label="Segments" tabIndex={0}>
      <table className="seg-table">
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                scope="col"
                aria-sort={sort === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                <button type="button" className="sort-btn" onClick={() => onSort(c.key)}>
                  {c.label}
                  <span className="sort-ind" aria-hidden="true">
                    {sort === c.key ? (dir === 'asc' ? '\u25B2' : '\u25BC') : '\u25B4\u25BE'}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const href = `#${withQuery(`/segment/${s.segment}`, linkQuery)}`;
            return (
              <tr
                key={s.segment}
                className="seg-row"
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a')) return;
                  navigate(href);
                }}
              >
                <td>
                  <a href={href} className="mono seg-link">{s.segment}</a>
                  {s.report_source === 'teacher_placeholder' && <> <PlaceholderRibbon /></>}
                </td>
                <td className="mono">{s.channel}</td>
                <td><FlagChip value={s.dataset_label} /></td>
                <td>
                  <span className="det-cell">
                    <FlagChip value={s.detector.pred} />
                    <ProbabilityBar proba={s.detector.proba} />
                    <span className="mono small">{formatProba(s.detector.proba)}</span>
                  </span>
                </td>
                <td><OutcomeChip outcome={s.outcome} /></td>
                <td>{s.detector.review ? <ReviewChip /> : <span className="muted small">No</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
