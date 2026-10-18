import vectors from '../test/number_extraction_vectors.json';
import realSegments from '../../public/data/segments.json';
import devSegments from '../../public/data/segments.dev.json';
import type { Report, Segment } from '../data/types';
import { NUM_RE, extractNumbers, tokenise } from './numbers';

describe('number tokeniser', () => {
  it('uses the same regex source as the extraction vectors', () => {
    expect(`/${NUM_RE.source}/${NUM_RE.flags}`).toBe(vectors.regex_js);
  });

  it.each(vectors.extraction)('extracts numbers from "$text"', ({ text, numbers }) => {
    expect(extractNumbers(text)).toEqual(numbers);
  });

  it('zips matches with flags in order and keeps the text intact', () => {
    const tokens = tokenise('kurtosis (-1.484) and 357 gaps', [1, 0]);
    expect(tokens).toEqual([
      { kind: 'text', text: 'kurtosis (' },
      { kind: 'number', text: '-1.484', supported: true },
      { kind: 'text', text: ') and ' },
      { kind: 'number', text: '357', supported: false },
      { kind: 'text', text: ' gaps' },
    ]);
    expect(tokens!.map((t) => t.text).join('')).toBe('kurtosis (-1.484) and 357 gaps');
  });

  it('returns null when the flag count does not match', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(tokenise('values 1 and 2', [1])).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it.each([
    ['dev fixture', devSegments as unknown as Segment[]],
    ['real data', realSegments as unknown as Segment[]],
  ])('every report in the %s has one flag per extracted number', (_, segments) => {
    const reports: Report[] = segments.flatMap((s) => [
      s.reports.detector_label,
      ...(s.reports.dataset_label ? [s.reports.dataset_label] : []),
      ...(s.compare ? [s.compare.teacher, s.compare.base_prompted] : []),
    ]);
    const bad = reports.filter((r) => extractNumbers(r.text).length !== r.number_flags.length);
    expect(bad).toEqual([]);
  });
});
