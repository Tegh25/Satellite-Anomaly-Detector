import type { Outcome, Segment } from '../data/types';

export type SortKey = 'segment' | 'channel' | 'dataset_label' | 'proba' | 'outcome' | 'review';
export type SortDir = 'asc' | 'desc';

export interface ExploreState {
  label: 'all' | '0' | '1';
  outcome: 'all' | Outcome;
  channel: string; // 'all' or a channel id
  review: boolean;
  q: string;
  sort: SortKey;
  dir: SortDir;
  page: number;
}

export const DEFAULT_STATE: ExploreState = {
  label: 'all',
  outcome: 'all',
  channel: 'all',
  review: false,
  q: '',
  sort: 'segment',
  dir: 'asc',
  page: 1,
};

export const PAGE_SIZE = 25;

const OUTCOMES: readonly string[] = ['correct', 'false_alarm', 'missed_anomaly'];
const SORTS: readonly string[] = ['segment', 'channel', 'dataset_label', 'proba', 'outcome', 'review'];

export function parseExploreState(params: URLSearchParams): ExploreState {
  const label = params.get('label');
  const outcome = params.get('outcome');
  const sort = params.get('sort');
  const page = Number(params.get('page'));
  return {
    label: label === '0' || label === '1' ? label : 'all',
    outcome: outcome && OUTCOMES.includes(outcome) ? (outcome as Outcome) : 'all',
    channel: params.get('channel') || 'all',
    review: params.get('review') === '1',
    q: params.get('q') ?? '',
    sort: sort && SORTS.includes(sort) ? (sort as SortKey) : 'segment',
    dir: params.get('dir') === 'desc' ? 'desc' : 'asc',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** Only non-default values go into the query string, so the URL stays short. */
export function serializeExploreState(s: ExploreState, includePage = true): string {
  const p = new URLSearchParams();
  if (s.label !== 'all') p.set('label', s.label);
  if (s.outcome !== 'all') p.set('outcome', s.outcome);
  if (s.channel !== 'all') p.set('channel', s.channel);
  if (s.review) p.set('review', '1');
  if (s.q.trim()) p.set('q', s.q.trim());
  if (s.sort !== 'segment') p.set('sort', s.sort);
  if (s.dir !== 'asc') p.set('dir', s.dir);
  if (includePage && s.page > 1) p.set('page', String(s.page));
  return p.toString();
}

function sortValue(s: Segment, key: SortKey): number | string {
  switch (key) {
    case 'segment': return s.segment;
    case 'channel': return s.channel;
    case 'dataset_label': return s.dataset_label;
    case 'proba': return s.detector.proba;
    case 'outcome': return s.outcome;
    case 'review': return s.detector.review ? 1 : 0;
  }
}

export function filterAndSort(segments: readonly Segment[], st: ExploreState): Segment[] {
  const q = st.q.trim();
  const rows = segments.filter((s) =>
    (st.label === 'all' || String(s.dataset_label) === st.label)
    && (st.outcome === 'all' || s.outcome === st.outcome)
    && (st.channel === 'all' || s.channel === st.channel)
    && (!st.review || s.detector.review)
    && (!q || String(s.segment).includes(q)));
  const sign = st.dir === 'asc' ? 1 : -1;
  return rows.sort((a, b) => {
    const va = sortValue(a, st.sort);
    const vb = sortValue(b, st.sort);
    if (va < vb) return -sign;
    if (va > vb) return sign;
    return a.segment - b.segment;
  });
}

export function summarise(segments: readonly Segment[]) {
  const n = segments.length;
  const errors = segments.filter((s) => s.outcome !== 'correct').length;
  const review = segments.filter((s) => s.detector.review).length;
  return { n, errors, review };
}

export function pickRandom<T>(items: readonly T[]): T | undefined {
  return items.length ? items[Math.floor(Math.random() * items.length)] : undefined;
}
