export default function ReliabilityPage() {
  return (
    <div style={{ padding: "16px", maxWidth: "640px" }}>
      <h2>How reliable is this</h2>

      <h3>What the number is</h3>
      <p>
        Each facility is linked once to the nearest grid cell of the Open-Meteo Flood API, which serves GloFAS
        river discharge in cubic metres per second. The level shown compares the cell's 7-day forecast maximum
        against that same cell's own 30-year history (1984 to present): NORMAL at or below the 95th percentile,
        WATCH above it, WARNING above the 99th percentile, SEVERE above the cell's 2022 annual maximum.
      </p>

      <h3>The 5 km limit</h3>
      <p>
        The model resolution is about 5 km. A cell is not a measurement at the clinic door. Terrain, levees and
        roads all decide what water actually reaches a building, and none of that is represented here.
      </p>

      <h3>What NO_SIGNAL means</h3>
      <p>
        NO_SIGNAL means the cell's 30-year median discharge is below a floor of 100 cubic metres per second, an
        arbitrary value chosen to separate small streams from large rivers. Small streams and hill towns,
        including Enugu and Nsukka in our own tests, return no usable flood signal from this model.
      </p>

      <h3>The facility data</h3>
      <p>
        Facility locations come from GRID3, via the Humanitarian Data Exchange. This data is not validated
        against a site visit. A facility pin can be wrong, closed, or duplicated.
      </p>

      <h3>The backtest</h3>
      <p>
        See <a href="/docs/BACKTEST.md">docs/BACKTEST.md</a> for the 2022 comparison against reported flooded
        LGAs, including its sample size and limits.
      </p>

      <p className="data-quality-line" style={{ padding: 0, borderTop: "none" }}>
        This is a river-level warning for facilities near large rivers. It is not a flood-inundation forecast for
        a building.
      </p>
    </div>
  );
}
