import type { Level } from "../types";
import { LEVEL_LABELS } from "../types";

const LEVELS: Level[] = ["NORMAL", "WATCH", "WARNING", "SEVERE", "NO_SIGNAL"];

const SHAPE_GLYPH: Record<Level, string> = {
  NORMAL: "●",
  WATCH: "▲",
  WARNING: "■",
  SEVERE: "◆",
  NO_SIGNAL: "◌",
};

export default function LevelLegend() {
  return (
    <ul
      aria-label="Alert level legend"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        listStyle: "none",
        padding: "8px 16px",
        margin: 0,
        fontSize: "0.85rem",
      }}
    >
      {LEVELS.map((level) => (
        <li key={level} className={`level-badge level-badge--${level}`}>
          <span aria-hidden="true">{SHAPE_GLYPH[level]}</span>
          {LEVEL_LABELS[level]}
        </li>
      ))}
    </ul>
  );
}
