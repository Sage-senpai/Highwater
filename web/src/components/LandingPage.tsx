import RiverIllustration from "./RiverIllustration";

interface Props {
  facilityCount: number;
  stateCount: number;
  dataDate: string | null;
  onEnter: () => void;
  onReliability: () => void;
}

export default function LandingPage({ facilityCount, stateCount, dataDate, onEnter, onReliability }: Props) {
  return (
    <div style={{ overflowY: "auto", height: "100%" }}>
      <section
        style={{
          background: "var(--color-ink)",
          color: "var(--color-surface)",
          padding: "var(--space-5) var(--space-3)",
        }}
      >
        <div className="landing-hero" style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div>
            <h1 className="landing-headline">A week's warning for the clinics nearest the river.</h1>
            <p className="landing-lede" style={{ color: "var(--color-surface)", opacity: 0.9 }}>
              Floods have damaged health facilities in Bayelsa, Jigawa, Kogi and Borno. Nigeria's 2026 flood
              outlook names 14,118 communities at high risk. HighWater pins each facility to the nearest large
              river and flags when that river's 7-day forecast crosses its own 30-year flood levels.
            </p>
            <div className="landing-cta-row">
              <button
                onClick={onEnter}
                style={{
                  padding: "10px 20px",
                  background: "var(--color-surface)",
                  color: "var(--color-ink)",
                  border: "1px solid var(--color-surface)",
                  borderRadius: "var(--radius)",
                  fontWeight: 600,
                }}
              >
                See today's map
              </button>
              <button
                onClick={onReliability}
                style={{
                  padding: "10px 16px",
                  background: "transparent",
                  color: "var(--color-surface)",
                  border: "1px solid rgba(246, 244, 239, 0.4)",
                  borderRadius: "var(--radius)",
                }}
              >
                How reliable is this
              </button>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <RiverIllustration />
          </div>
        </div>
      </section>

      <section style={{ padding: "var(--space-5) var(--space-3)", maxWidth: "1000px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-ink-muted)", margin: "0 0 var(--space-3)" }}>
          Live now, from today's data
        </h2>
        <div className="landing-stats">
          <div>
            <p className="landing-stat-value">{facilityCount}</p>
            <p className="landing-stat-label">facilities linked to real river data</p>
          </div>
          <div>
            <p className="landing-stat-value">{stateCount}</p>
            <p className="landing-stat-label">states covered so far, more to follow</p>
          </div>
          <div>
            <p className="landing-stat-value">{dataDate ? dataDate.slice(0, 10) : "pending"}</p>
            <p className="landing-stat-label">date of this forecast</p>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 var(--space-3) var(--space-5)", maxWidth: "640px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 var(--space-2)" }}>What this is, and what it is not</h2>
        <p style={{ margin: "0 0 var(--space-2)" }}>
          This is a river-level warning for facilities near large rivers, built on open GloFAS data. It tells a
          health officer which facilities sit near a river forecast above its own historical flood levels, one
          week ahead.
        </p>
        <p className="data-quality-line" style={{ padding: 0, borderTop: "none", margin: 0 }}>
          It is not a flood-inundation forecast for a building. Facility locations come from GRID3, not
          validated. Small streams are not represented. See "How reliable is this" for the full method and its
          limits.
        </p>
      </section>
    </div>
  );
}
