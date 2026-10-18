import devSegments from '../../public/data/segments.dev.json';
import type { Segment } from '../data/types';
import { DEFAULT_STATE, filterAndSort, parseExploreState, serializeExploreState, summarise } from './explore';

const segs = devSegments as unknown as Segment[];

describe('explorer filtering', () => {
  it('combines filters', () => {
    const rows = filterAndSort(segs, { ...DEFAULT_STATE, outcome: 'missed_anomaly', channel: 'CADC0894', review: true });
    expect(rows.map((s) => s.segment)).toEqual([1793]);
  });

  it('filters by dataset label and segment number search', () => {
    expect(filterAndSort(segs, { ...DEFAULT_STATE, label: '0', q: '15' }).map((s) => s.segment)).toEqual([1522]);
    expect(filterAndSort(segs, { ...DEFAULT_STATE, label: '1', q: '15' })).toEqual([]);
  });

  it('sorts by probability descending with segment as tie-breaker', () => {
    const rows = filterAndSort(segs, { ...DEFAULT_STATE, sort: 'proba', dir: 'desc' });
    const probs = rows.map((s) => s.detector.proba);
    expect(probs).toEqual([...probs].sort((a, b) => b - a));
  });

  it('round-trips state through the URL', () => {
    const st = { ...DEFAULT_STATE, label: '0' as const, outcome: 'false_alarm' as const, review: true, sort: 'channel' as const, dir: 'desc' as const, page: 3 };
    expect(parseExploreState(new URLSearchParams(serializeExploreState(st)))).toEqual(st);
    expect(serializeExploreState(DEFAULT_STATE)).toBe('');
  });

  it('ignores invalid URL values', () => {
    expect(parseExploreState(new URLSearchParams('outcome=bogus&sort=x&page=-2&label=7'))).toEqual(DEFAULT_STATE);
  });

  it('summarises errors and review share from data', () => {
    expect(summarise(segs)).toEqual({ n: 17, errors: 4, review: 6 });
  });
});
