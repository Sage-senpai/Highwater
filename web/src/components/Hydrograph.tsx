// A small dependency-free line chart for the 7-day forecast against the
// three threshold lines. No chart library needed for this shape of data.
interface Props {
  daily: { date: string; value: number }[];
  p95: number;
  p99: number;
  max2022: number;
}

const WIDTH = 320;
const HEIGHT = 160;
const PAD = 28;

export default function Hydrograph({ daily, p95, p99, max2022 }: Props) {
  if (daily.length === 0) {
    return <p>No forecast data to chart.</p>;
  }
  const values = daily.map((d) => d.value);
  const maxValue = Math.max(...values, p95, p99, max2022) * 1.05;
  const minValue = 0;

  const scaleX = (i: number) => PAD + (i / (daily.length - 1 || 1)) * (WIDTH - PAD * 2);
  const scaleY = (v: number) =>
    HEIGHT - PAD - ((v - minValue) / (maxValue - minValue || 1)) * (HEIGHT - PAD * 2);

  const linePath = daily.map((d, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(d.value)}`).join(" ");

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height={HEIGHT}
      role="img"
      aria-label="Seven day river discharge forecast against flood watch, warning and 2022 maximum lines"
    >
      <line x1={PAD} x2={WIDTH - PAD} y1={scaleY(p95)} y2={scaleY(p95)} stroke="#C98A00" strokeDasharray="4 3" />
      <line x1={PAD} x2={WIDTH - PAD} y1={scaleY(p99)} y2={scaleY(p99)} stroke="#C2410C" strokeDasharray="4 3" />
      <line x1={PAD} x2={WIDTH - PAD} y1={scaleY(max2022)} y2={scaleY(max2022)} stroke="#7F1D1D" strokeDasharray="4 3" />
      <path d={linePath} fill="none" stroke="#14211F" strokeWidth={2} />
      {daily.map((d, i) => (
        <circle key={d.date} cx={scaleX(i)} cy={scaleY(d.value)} r={3} fill="#14211F" />
      ))}
      <text x={PAD} y={scaleY(p95) - 4} fontSize={10} fill="#C98A00">p95 (watch)</text>
      <text x={PAD} y={scaleY(p99) - 4} fontSize={10} fill="#C2410C">p99 (warning)</text>
      <text x={PAD} y={scaleY(max2022) - 4} fontSize={10} fill="#7F1D1D">2022 max</text>
    </svg>
  );
}
