// Alert text generation (M7). English only. ASCII only, 160 characters max.
// See docs/claude.md writing style: no em dashes, no filler.
import type { Level } from "./levels.js";

export interface AlertInput {
  facilityName: string;
  state: string;
  level: Exclude<Level, "NORMAL" | "NO_SIGNAL">;
  peakDate: string; // YYYY-MM-DD
}

const LEVEL_WORDS: Record<string, string> = {
  WATCH: "flood watch level",
  WARNING: "flood warning level",
  SEVERE: "its 2022 flood level",
};

export function formatPeakDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d} ${months[m - 1]}`;
}

const MAX_LEN = 160;

export function buildAlertText(input: AlertInput): string {
  const levelWord = LEVEL_WORDS[input.level] ?? "a flood level";
  const peak = formatPeakDate(input.peakDate);
  let name = input.facilityName;
  let text = toAsciiSafe(
    `HighWater: River near ${name}, ${input.state} forecast above ${levelWord} within 7 days (peak ${peak}). Check access routes and stock.`
  );
  // If a long facility name pushes the message over the limit, shorten the
  // name rather than drop other information. This keeps every generated
  // message within the SMS single-segment ASCII length.
  while (text.length > MAX_LEN && name.length > 10) {
    name = name.slice(0, name.length - 5).trimEnd();
    text = toAsciiSafe(
      `HighWater: River near ${name}, ${input.state} forecast above ${levelWord} within 7 days (peak ${peak}). Check access routes and stock.`
    );
  }
  return text;
}

// Strips characters outside printable ASCII (e.g. an em dash or curly
// quote), replacing with a plain ASCII equivalent where sensible.
export function toAsciiSafe(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x00-\x7F]/g, "");
}

export function isAscii(text: string): boolean {
  return /^[\x00-\x7F]*$/.test(text);
}

// Stubs for other Nigerian languages. Machine translation is not run here;
// these are placeholders for a native speaker to review and fill in.
export const STUB_TRANSLATIONS = {
  hausa: "NEEDS NATIVE REVIEW: Hausa translation not yet written.",
  igbo: "NEEDS NATIVE REVIEW: Igbo translation not yet written.",
  yoruba: "NEEDS NATIVE REVIEW: Yoruba translation not yet written.",
};
