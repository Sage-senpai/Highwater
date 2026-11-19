import type { Level } from "../types";
import { LEVEL_LABELS } from "../types";

interface Props {
  counts: Record<Level, number>;
  dataDate: string | null;
}

const ORDER: Level[] = ["SEVERE", "WARNING", "WATCH", "NORMAL", "NO_SIGNAL"];

export default function SummaryStrip({ counts, dataDate }: Props) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "8px",
        padding: "10px 16px",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {ORDER.map((level) => (
          <span key={level} className={`level-badge level-badge--${level}`}>
            {LEVEL_LABELS[level]}: {counts[level] ?? 0}
          </span>
        ))}
      </div>
      <span style={{ fontSize: "0.8rem", color: "var(--color-ink-muted)" }}>
        Data date: {dataDate ?? "not generated yet"}
      </span>
    </div>
  );
}
