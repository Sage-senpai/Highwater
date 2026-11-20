// Percentile and plateau-detection helpers, used by the cell pinner (M2)
// and the climatology step (M3).

export function dropNulls(values: (number | null)[]): number[] {
  return values.filter((v): v is number => v !== null && Number.isFinite(v));
}

// Linear-interpolation percentile (same convention as numpy's default).
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return NaN;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * frac;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return percentile(sorted, 50);
}

export function sortAsc(values: number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

// Detects runs of 3 or more identical consecutive values anywhere in the
// series (the Lokoja plateau pattern from docs/claude.md). Returns the
// number of values involved in such runs, and the longest run length.
export function detectPlateaus(values: number[]): { flaggedCount: number; longestRun: number } {
  let flaggedCount = 0;
  let longestRun = 1;
  let runStart = 0;
  for (let i = 1; i <= values.length; i++) {
    const sameAsPrev = i < values.length && values[i] === values[i - 1];
    if (!sameAsPrev) {
      const runLen = i - runStart;
      if (runLen >= 3) {
        flaggedCount += runLen;
        longestRun = Math.max(longestRun, runLen);
      }
      runStart = i;
    }
  }
  return { flaggedCount, longestRun };
}

// Like detectPlateaus, but only counts a run of 3 or more identical
// consecutive values if the repeated value itself is at or above
// `threshold` (the cell's own 99th percentile, in practice). This is the
// actual Lokoja pattern from docs/claude.md: a suspiciously repeated HIGH
// value, not just any flat stretch (which is common and harmless at low
// flow, e.g. several exact-zero days in the dry season).
export function detectTopPlateau(
  values: number[],
  threshold: number
): { flaggedCount: number; longestRun: number } {
  let flaggedCount = 0;
  let longestRun = 0;
  let runStart = 0;
  for (let i = 1; i <= values.length; i++) {
    const sameAsPrev = i < values.length && values[i] === values[i - 1];
    if (!sameAsPrev) {
      const runLen = i - runStart;
      if (runLen >= 3 && values[runStart] >= threshold) {
        flaggedCount += runLen;
        longestRun = Math.max(longestRun, runLen);
      }
      runStart = i;
    }
  }
  return { flaggedCount, longestRun };
}
