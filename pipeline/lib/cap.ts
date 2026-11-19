// CAP 1.2 XML generation for an alert (M7).
// https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html
import { XMLBuilder } from "fast-xml-parser";
import type { Level } from "./levels.js";

export interface CapInput {
  id: string;
  sentIso: string; // ISO 8601 with offset, e.g. 2026-11-19T12:00:00+00:00
  facilityName: string;
  state: string;
  lga: string;
  lat: number;
  lon: number;
  level: Exclude<Level, "NORMAL" | "NO_SIGNAL">;
  headline: string;
  description: string;
  effectiveIso: string;
  expiresIso: string;
}

const SEVERITY_BY_LEVEL: Record<string, string> = {
  WATCH: "Moderate",
  WARNING: "Severe",
  SEVERE: "Extreme",
};

export function buildCapXml(input: CapInput): string {
  const builder = new XMLBuilder({
    format: true,
    ignoreAttributes: false,
    suppressEmptyNode: true,
  });

  const doc = {
    "?xml": { "@_version": "1.0", "@_encoding": "UTF-8" },
    alert: {
      "@_xmlns": "urn:oasis:names:tc:emergency:cap:1.2",
      identifier: input.id,
      sender: "highwater.example (unofficial hackathon prototype, not an operational alerting authority)",
      sent: input.sentIso,
      status: "Exercise",
      msgType: "Alert",
      scope: "Public",
      info: {
        category: "Met",
        event: "River discharge forecast above the cell's own historical threshold",
        urgency: "Expected",
        severity: SEVERITY_BY_LEVEL[input.level] ?? "Unknown",
        certainty: "Possible",
        effective: input.effectiveIso,
        expires: input.expiresIso,
        senderName: "HighWater (hackathon prototype, not a government alerting system)",
        headline: input.headline,
        description: input.description,
        area: {
          areaDesc: `${input.facilityName}, ${input.lga}, ${input.state}, Nigeria`,
          circle: `${input.lat},${input.lon} 5`,
        },
      },
    },
  };

  return builder.build(doc);
}
