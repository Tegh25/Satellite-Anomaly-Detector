// Must match NUM_RE in export_demo_data.py exactly. The browser only finds numbers;
// whether each one is supported comes from the precomputed number_flags.
export const NUM_RE = /(?<![\w.])[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?(?!\w)/g;

export function extractNumbers(text: string): string[] {
  return Array.from(text.matchAll(NUM_RE), (m) => m[0]);
}

export type Token =
  | { kind: 'text'; text: string }
  | { kind: 'number'; text: string; supported: boolean };

/**
 * Splits text into plain and number tokens, zipping the i-th number with flags[i].
 * Returns null when the counts disagree, so the caller can fall back to plain text.
 */
export function tokenise(text: string, flags: readonly (0 | 1)[]): Token[] | null {
  const matches = Array.from(text.matchAll(NUM_RE));
  if (matches.length !== flags.length) {
    if (import.meta.env.DEV) {
      console.warn(
        `number_flags mismatch: found ${matches.length} numbers but got ${flags.length} flags; rendering plain text.`,
      );
    }
    return null;
  }
  const out: Token[] = [];
  let last = 0;
  matches.forEach((m, i) => {
    const start = m.index ?? 0;
    if (start > last) out.push({ kind: 'text', text: text.slice(last, start) });
    out.push({ kind: 'number', text: m[0], supported: flags[i] === 1 });
    last = start + m[0].length;
  });
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}
