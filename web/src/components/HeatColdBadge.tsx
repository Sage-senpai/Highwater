import type { Facility } from "../types";

// Experimental heat/cold indicator. A different data source and method
// than the river-level warning (Open-Meteo's standard weather forecast
// and historical archive, not GloFAS river discharge; see
// pipeline/heat-cold.ts and docs/PITCH.md). Deliberately kept as its own
// small, separately-labelled component, never merged into the river
// level badge or its NORMAL/WATCH/WARNING/SEVERE/NO_SIGNAL colors.
interface Props {
  facility: Facility;
}

export default function HeatColdBadge({ facility }: Props) {
  const { heatRiskIn7Days, coldRiskIn7Days, heatColdLowConfidence } = facility;

  if (heatRiskIn7Days === undefined && coldRiskIn7Days === undefined) {
    return null;
  }

  if (!heatRiskIn7Days && !coldRiskIn7Days) {
    return (
      <p
        style={{
          fontSize: "0.8rem",
          color: "var(--color-ink-muted)",
          margin: "4px 16px",
          padding: "6px 8px",
          border: "1px dashed var(--color-border)",
          borderRadius: "4px",
        }}
      >
        Experimental heat/cold layer: no heat or harmattan-cold day flagged in the next 7 days for this
        location. Different data source and method than the river level above.
      </p>
    );
  }

  return (
    <div
      role="note"
      aria-label="Experimental heat and cold risk indicator"
      style={{
        margin: "4px 16px",
        padding: "8px",
        border: "1px dashed var(--color-ink-muted)",
        borderRadius: "4px",
        fontSize: "0.85rem",
      }}
    >
      <strong>Experimental</strong>: a different data source and method than the river level above
      (Open-Meteo weather forecast and archive, not GloFAS river discharge).
      <ul style={{ margin: "4px 0 0", paddingLeft: "18px" }}>
        {heatRiskIn7Days && <li>Heat risk: at least one day in the next 7 is above this area's own historical 95th percentile apparent temperature.</li>}
        {coldRiskIn7Days && <li>Cold risk: at least one day in the next 7 is below this area's own historical 5th percentile night temperature (harmattan cold).</li>}
      </ul>
      {heatColdLowConfidence && (
        <p style={{ margin: "4px 0 0", fontStyle: "italic" }}>
          Low confidence: fewer than 10 years of history for this area's weather cell.
        </p>
      )}
    </div>
  );
}
