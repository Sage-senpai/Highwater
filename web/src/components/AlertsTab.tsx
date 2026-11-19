import { useEffect, useState } from "react";
import type { Facility, LatestData, Level } from "../types";
import { LEVEL_LABELS } from "../types";

interface AlertFileRow {
  facilityId: string;
  text: string;
  level: Level;
  capUrl: string;
}

interface AlertRow extends AlertFileRow {
  facility: Facility;
}

interface Props {
  facilities: Facility[];
  latest: LatestData | null;
}

export default function AlertsTab({ facilities, latest }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [rows, setRows] = useState<AlertRow[] | null>(null);

  useEffect(() => {
    fetch("/data/alerts-today.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: AlertFileRow[]) => {
        const facilityById = new Map(facilities.map((f) => [f.id, f]));
        const result: AlertRow[] = [];
        for (const row of data) {
          const facility = facilityById.get(row.facilityId);
          if (facility) result.push({ ...row, facility });
        }
        setRows(result);
      })
      .catch(() => setRows([]));
  }, [facilities]);

  if (!latest || rows === null) {
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
            key={row.facilityId}
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
                setCopiedId(row.facilityId);
              }}
            >
              {copiedId === row.facilityId ? "Copied" : "Copy message"}
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
