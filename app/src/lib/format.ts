function stripZeros(mantissa: string): string {
  return mantissa.includes('.') ? mantissa.replace(/\.?0+$/, '') : mantissa;
}

/** Integers as-is; floats with toPrecision(6) and trailing zeros stripped. */
export function formatValue(x: number): string {
  if (Number.isInteger(x)) return String(x);
  const s = x.toPrecision(6);
  const [m, e] = s.split('e');
  return e === undefined ? stripZeros(s) : `${stripZeros(m ?? '')}e${e}`;
}

export function formatProba(p: number): string {
  return p.toFixed(2);
}

export function formatPct(x: number): string {
  return `${x}%`;
}

export function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}
