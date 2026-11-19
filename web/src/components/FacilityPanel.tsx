import type { Facility, FacilityStatus, LatestData } from "../types";
import { LEVEL_LABELS } from "../types";
import Hydrograph from "./Hydrograph";

interface Props {
  facility: Facility;
  status: FacilityStatus | null;
  cellData: LatestData["cells"][string] | null;
  onClose: () => void;
}

export default function FacilityPanel({ facility, status, cellData, onClose }: Props) {
  return (
    <aside
      role="dialog"
      aria-label={`Details for ${facility.name}`}
      style={{
        background: "var(--color-surface)",
        borderTop: "1px solid var(--color-border)",
        padding: "16px",
        maxHeight: "60vh",
        overflowY: "auto",
      }}
    >
      <button onClick={onClose} aria-label="Close facility details" style={{ float: "right" }}>
        Close
      </button>
      <h2 style={{ marginTop: 0 }}>{facility.name}</h2>
      <p style={{ color: "var(--color-ink-muted)", marginTop: "-8px" }}>
        {facility.lga}, {facility.state}
        {facility.type ? ` — ${facility.type}` : ""}
      </p>

      {status ? (
        <>
          <p>
            <span className={`level-badge level-badge--${status.level}`}>{LEVEL_LABELS[status.level]}</span>
            {status.lowConfidence && (
              <span style={{ marginLeft: "8px", color: "var(--color-ink-muted)" }}>low confidence</span>
            )}
          </p>
          <p>
            Pinned river cell: {status.cell.lat.toFixed(3)}, {status.cell.lon.toFixed(3)} ({status.distance_km} km
            from the facility).
          </p>
          {status.ratioToP95 !== null && (
            <p>Forecast is {Math.round(status.ratioToP95 * 100)} percent of the p95 watch threshold.</p>
          )}

          {cellData && (
            <>
              <h3>7-day forecast</h3>
              <Hydrograph daily={cellData.forecastDaily} p95={cellData.p95} p99={cellData.p99} max2022={cellData.max2022} />
            </>
          )}
        </>
      ) : (
        <p>No current forecast data for this facility.</p>
      )}

      <p className="data-quality-line" style={{ padding: 0, borderTop: "none" }}>
        River discharge is modelled, not measured, resolution about 5 km. Facility location from GRID3, not
        validated. This is a river-level warning, not a flood-inundation forecast for this building.
      </p>
    </aside>
  );
}
