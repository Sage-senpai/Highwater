const DISMISS_KEY = "highwater:intro-dismissed";

interface Props {
  onDismiss: () => void;
}

export default function IntroPanel({ onDismiss }: Props) {
  return (
    <div
      role="region"
      aria-label="About HighWater"
      style={{
        padding: "var(--space-3)",
        borderBottom: "1px solid var(--color-border)",
        maxWidth: "640px",
      }}
    >
      <p style={{ margin: "0 0 var(--space-2)" }}>
        Floods have damaged health facilities in Bayelsa, Jigawa, Kogi and Borno, and Nigeria's 2026 flood outlook
        names 14,118 communities at high risk. HighWater pins each facility to the nearest large river and flags
        when that river's 7-day forecast crosses its own 30-year flood levels, one week ahead.
      </p>
      <p style={{ margin: "0 0 var(--space-3)", color: "var(--color-ink-muted)" }}>
        This is a river-level warning for facilities near large rivers. It is not a flood-inundation forecast for
        a building. See "How reliable is this" for the method and its limits.
      </p>
      <button
        onClick={onDismiss}
        style={{
          padding: "6px 14px",
          background: "var(--color-ink)",
          color: "var(--color-surface)",
          border: "1px solid var(--color-ink)",
          borderRadius: "var(--radius)",
        }}
      >
        See today's map
      </button>
    </div>
  );
}

export function isIntroDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function setIntroDismissed(value: boolean): void {
  try {
    if (value) localStorage.setItem(DISMISS_KEY, "1");
    else localStorage.removeItem(DISMISS_KEY);
  } catch {
    // Private browsing or blocked storage. The panel just reappears next
    // visit, which is a reasonable fallback, not a bug worth handling.
  }
}
