import { formatValue, percent } from './format';

describe('formatValue', () => {
  it.each([
    [257, '257'],
    [0, '0'],
    [-1.4843933372949996, '-1.48439'],
    [0.000010584846070038911, '0.0000105848'],
    [5.27902278315266e-10, '5.27902e-10'],
    [5.547101361564531e-13, '5.5471e-13'],
    [0.5, '0.5'],
    [1.25e-7, '1.25e-7'],
    [123456.7, '123457'],
  ])('formats %s as %s', (x, s) => {
    expect(formatValue(x)).toBe(s);
  });
});

describe('percent', () => {
  it('rounds and guards against zero', () => {
    expect(percent(105, 529)).toBe(20);
    expect(percent(1, 0)).toBe(0);
  });
});
