import { useEffect, useState } from "react";
import type { Facility, LatestData } from "../types";
import { LEVEL_LABELS } from "../types";

interface AlertRow {
  facility: Facility;
  level: "WATCH" | "WARNING" | "SEVERE";
  text: string;
  capUrl: string;
}

interface Props {
  facilities: Facility[];
  latest: LatestData | null;
}

export default function AlertsTab({ facilities, latest }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rows, setRows] = useState<AlertRow[]>([]);

  useEffect(() => {
    if (!latest) return;
    const result: AlertRow[] = [];
    for (const f of facilities) {
      const status = latest.facilities[f.id];
      if (!status) continue;
      if (status.level === "WATCH" || status.level === "WARNING" || status.level === "SEVERE") {
        result.push({
          facility: f,
          level: status.level,
          text: `HighWater: River near ${f.name}, ${f.state} forecast above ${LEVEL_LABELS[status.level].toLowerCase()} level within 7 days. Check access routes and stock.`,
          capUrl: `/alerts/${f.id}.xml`,
        });
      }
    }
    setRows(result);
  }, [facilities, latest]);

  if (!latest) {
    return <p style={{ padding: "16px" }}>No alert data generated yet.</p>;
  }

  if (rows.length === 0) {
    return (
      <div style={{ padding: "16px" }}>
        <p>No facility is at watch level or above today.</p>
        <p className="data-quality-line" style={{ padding: 0, borderTop: "none" }}>
          Source: data/latest.json, generated {latest.generated_at}.
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px" }}>
      <h2>Today's alerts</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {rows.map((row) => (
          <li
            key={row.facility.id}
            style={{ border: "1px solid var(--color-border)", borderRadius: "6px", padding: "12px", marginBottom: "10px" }}
          >
            <p style={{ margin: 0 }}>
              <span className={`level-badge level-badge--${row.level}`}>{LEVEL_LABELS[row.level]}</span>{" "}
              {row.facility.name}, {row.facility.state}
            </p>
            <p style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{row.text}</p>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(row.text).catch(() => undefined);
                setCopiedId(row.facility.id);
              }}
            >
              {copiedId === row.facility.id ? "Copied" : "Copy message"}
            </button>
            <a href={row.capUrl} style={{ marginLeft: "12px" }}>
              Download CAP XML
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
