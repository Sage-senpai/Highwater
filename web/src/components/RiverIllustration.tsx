// A literal, not decorative, illustration: a river with facilities pinned
// to it, each shown in the same shape-plus-colour language used on the
// real map (docs/claude.md's level table). No stock art, no gradients.
export default function RiverIllustration() {
  return (
    <svg
      viewBox="0 0 360 320"
      role="img"
      aria-label="A winding river with health facilities pinned to the nearest point on it"
      style={{ width: "100%", height: "auto", maxWidth: "420px" }}
    >
      <path
        d="M30 20 C 90 60, 60 120, 120 150 S 220 140, 230 200 S 170 260, 220 300"
        fill="none"
        stroke="#F6F4EF"
        strokeOpacity="0.55"
        strokeWidth="5"
        strokeLinecap="round"
      />

      {/* facility: NORMAL, pinned with a leader line */}
      <line x1="118" y1="150" x2="70" y2="110" stroke="#F6F4EF" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="70" cy="110" r="9" fill="#2F6F73" />

      {/* facility: WATCH, pinned with a leader line */}
      <line x1="222" y1="198" x2="275" y2="175" stroke="#F6F4EF" strokeOpacity="0.35" strokeWidth="1.5" />
      <polygon points="275,163 285,183 265,183" fill="#C98A00" />

      {/* facility: NORMAL */}
      <line x1="150" y1="162" x2="140" y2="210" stroke="#F6F4EF" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="140" cy="210" r="9" fill="#2F6F73" />

      {/* facility: NO_SIGNAL, hollow dotted, further from the river */}
      <line x1="55" y1="55" x2="100" y2="35" stroke="#F6F4EF" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="3 3" />
      <circle cx="100" cy="35" r="8" fill="none" stroke="#8A8F94" strokeWidth="2.5" strokeDasharray="3 3" />

      {/* facility: NORMAL, near the river's end */}
      <line x1="218" y1="268" x2="255" y2="280" stroke="#F6F4EF" strokeOpacity="0.35" strokeWidth="1.5" />
      <circle cx="255" cy="280" r="9" fill="#2F6F73" />
    </svg>
  );
}
