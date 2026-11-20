import { useEffect, useMemo, useState } from "react";
import type { Facility, Level, LatestData } from "./types";
import { loadStateIndex, loadStateFacilities, loadLatest } from "./data";
import MapView from "./components/MapView";
import LevelLegend from "./components/LevelLegend";
import SummaryStrip from "./components/SummaryStrip";
import FacilityPanel from "./components/FacilityPanel";
import AlertsTab from "./components/AlertsTab";
import ReliabilityPage from "./components/ReliabilityPage";
import IntroPanel, { isIntroDismissed, setIntroDismissed } from "./components/IntroPanel";

type Tab = "map" | "alerts" | "reliability";

export default function App() {
  const [tab, setTab] = useState<Tab>("map");
  const [states, setStates] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [latest, setLatest] = useState<LatestData | null>(null);
  const [levelFilter, setLevelFilter] = useState<Level | "ALL">("ALL");
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showIntro, setShowIntro] = useState(() => !isIntroDismissed());

  useEffect(() => {
    loadStateIndex().then((list) => {
      setStates(list);
      if (list.length > 0) setSelectedState(list[0]);
    });
    loadLatest().then(setLatest);
  }, []);

  useEffect(() => {
    if (!selectedState) return;
    loadStateFacilities(selectedState).then(setFacilities);
  }, [selectedState]);

  const filteredFacilities = useMemo(() => {
    if (levelFilter === "ALL" || !latest) return facilities;
    return facilities.filter((f) => latest.facilities[f.id]?.level === levelFilter);
  }, [facilities, latest, levelFilter]);

  const counts = useMemo(() => {
    const result: Record<Level, number> = { NO_SIGNAL: 0, NORMAL: 0, WATCH: 0, WARNING: 0, SEVERE: 0 };
    if (!latest) return result;
    for (const f of facilities) {
      const level = latest.facilities[f.id]?.level;
      if (level) result[level]++;
    }
    return result;
  }, [facilities, latest]);

  const selectedStatus = selectedFacility && latest ? latest.facilities[selectedFacility.id] ?? null : null;
  const selectedCellData =
    selectedStatus && latest ? latest.cells[`${selectedStatus.cell.lat.toFixed(4)},${selectedStatus.cell.lon.toFixed(4)}`] ?? null : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <header style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-border)" }}>
        <h1 style={{ margin: 0, fontSize: "1.3rem" }}>HighWater</h1>
        <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--color-ink-muted)" }}>
          River-level warning for facilities near large rivers. Not a flood forecast for a building.
        </p>
      </header>

      {showIntro && (
        <IntroPanel
          onDismiss={() => {
            setIntroDismissed(true);
            setShowIntro(false);
          }}
        />
      )}

      <nav aria-label="Main sections" style={{ display: "flex", gap: "4px", padding: "8px 16px", borderBottom: "1px solid var(--color-border)" }}>
        {(["map", "alerts", "reliability"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            aria-pressed={tab === t}
            style={{
              padding: "6px 12px",
              background: tab === t ? "var(--color-ink)" : "transparent",
              color: tab === t ? "var(--color-surface)" : "var(--color-ink)",
              border: "1px solid var(--color-ink)",
              borderRadius: "4px",
            }}
          >
            {t === "map" ? "Map" : t === "alerts" ? "Alerts" : "How reliable is this"}
          </button>
        ))}
        {!showIntro && (
          <button
            onClick={() => setShowIntro(true)}
            style={{
              padding: "6px 12px",
              background: "transparent",
              color: "var(--color-ink-muted)",
              border: "1px solid var(--color-border)",
              borderRadius: "4px",
              marginLeft: "auto",
            }}
          >
            About
          </button>
        )}
      </nav>

      {tab === "map" && (
        <>
          <div style={{ display: "flex", gap: "8px", padding: "8px 16px", alignItems: "center", flexWrap: "wrap" }}>
            <label>
              State:{" "}
              <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)}>
                {states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Level:{" "}
              <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value as Level | "ALL")}>
                <option value="ALL">All</option>
                <option value="SEVERE">Severe</option>
                <option value="WARNING">Warning</option>
                <option value="WATCH">Watch</option>
                <option value="NORMAL">Normal</option>
                <option value="NO_SIGNAL">No signal</option>
              </select>
            </label>
          </div>
          <SummaryStrip counts={counts} dataDate={latest?.generated_at ?? null} />
          <LevelLegend />
          <div style={{ position: "relative", flex: 1, minHeight: "300px" }}>
            <MapView
              facilities={filteredFacilities}
              statusById={latest?.facilities ?? {}}
              onSelect={setSelectedFacility}
            />
          </div>
          {selectedFacility && (
            <FacilityPanel
              facility={selectedFacility}
              status={selectedStatus}
              cellData={selectedCellData}
              onClose={() => setSelectedFacility(null)}
            />
          )}
        </>
      )}

      {tab === "alerts" && <AlertsTab facilities={facilities} latest={latest} />}
      {tab === "reliability" && <ReliabilityPage />}

      <p className="data-quality-line">
        Source: Open-Meteo Flood API (GloFAS), facility locations from GRID3 via HDX, not validated. Modelled, not
        measured.
      </p>
    </div>
  );
}
