const PALETTES = {
  gathering: { base: "#3d6b4f", deep: "#2a4a38", light: "#7da88a", foam: "#e4efe8" },
  cookout: { base: "#8d6e44", deep: "#5c4528", light: "#c4a06a", foam: "#f3eadc" },
  kids: { base: "#4a6d8c", deep: "#2f4a62", light: "#8fb0c9", foam: "#e8f0f6" },
  meeting: { base: "#3f4c46", deep: "#2a3330", light: "#8a9690", foam: "#e8ece9" },
  pool: { base: "#2f6f74", deep: "#1d4a4e", light: "#7ab3b8", foam: "#dcecee" },
};

function hashSeed(value) {
  const text = String(value ?? "");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function Scene({ type, n }) {
  const shift = (n % 28) - 14;
  if (type === "cookout") {
    return (
      <>
        <circle cx={90 + shift} cy="210" r="70" fill="currentColor" opacity="0.18" />
        <circle cx={220 + shift} cy="250" r="90" fill="currentColor" opacity="0.12" />
        <path d={`M${40 + shift} 280 C 120 140, 200 300, 310 170`} fill="none" stroke="currentColor" strokeWidth="18" opacity="0.22" />
        <path d={`M${20 + shift} 80 C 140 40, 180 120, 340 70`} fill="none" stroke="currentColor" strokeWidth="10" opacity="0.16" />
      </>
    );
  }
  if (type === "kids") {
    return (
      <>
        <rect x={30 + shift} y="40" width="70" height="70" rx="18" fill="currentColor" opacity="0.16" />
        <rect x={210 + shift} y="120" width="110" height="80" rx="24" fill="currentColor" opacity="0.14" />
        <circle cx={140 + shift} cy="220" r="46" fill="currentColor" opacity="0.18" />
        <circle cx={300 + shift} cy="50" r="28" fill="currentColor" opacity="0.2" />
      </>
    );
  }
  if (type === "meeting") {
    return (
      <>
        <path d="M0 70 H360 M0 140 H360 M0 210 H360 M0 280 H360" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.14" />
        <rect x={40 + (n % 12)} y="40" width="140" height="8" rx="4" fill="currentColor" opacity="0.18" />
        <rect x={40 + (n % 12)} y="110" width="220" height="8" rx="4" fill="currentColor" opacity="0.14" />
        <rect x={40 + (n % 12)} y="180" width="180" height="8" rx="4" fill="currentColor" opacity="0.12" />
      </>
    );
  }
  if (type === "pool") {
    return (
      <>
        <path d={`M-20 ${160 + (shift % 10)} C 80 110, 140 210, 240 150 S 360 90, 400 170 V 320 H -20 Z`} fill="currentColor" opacity="0.16" />
        <path d={`M-20 ${210 + (shift % 8)} C 90 170, 160 250, 260 200 S 380 150, 400 220 V 320 H -20 Z`} fill="currentColor" opacity="0.2" />
        <circle cx={80 + shift} cy="70" r="36" fill="currentColor" opacity="0.12" />
      </>
    );
  }
  return (
    <>
      <ellipse cx={80 + shift} cy="240" rx="110" ry="70" fill="currentColor" opacity="0.2" />
      <ellipse cx={230 + shift} cy="80" rx="90" ry="120" fill="currentColor" opacity="0.14" />
      <path d={`M${-10 + shift} 300 C 80 180, 160 320, 280 160 S 380 80, 420 200`} fill="none" stroke="currentColor" strokeWidth="22" opacity="0.16" />
      <circle cx={300 + shift} cy="240" r="54" fill="currentColor" opacity="0.12" />
    </>
  );
}

export default function EventWash({ type = "gathering", seed = 0, className = "", children }) {
  const palette = PALETTES[type] || PALETTES.gathering;
  const n = typeof seed === "number" ? seed : hashSeed(seed);
  return (
    <div className={className} style={{ background: palette.base, color: palette.foam, position: "relative", overflow: "hidden" }}>
      <svg
        viewBox="0 0 360 320"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", color: palette.light }}
      >
        <rect width="360" height="320" fill={palette.deep} opacity="0.35" />
        <Scene type={type} n={n} />
      </svg>
      {children ? <div style={{ position: "relative", zIndex: 1 }}>{children}</div> : null}
    </div>
  );
}
