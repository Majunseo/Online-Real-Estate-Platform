/** 첫 화면 큰 배경. 아침 하늘 아래 아파트 단지와 공원 (직접 그린 그림) */

// 먼 스카이라인: [x, 폭, 높이]
const FAR: [number, number, number][] = [
  [0, 70, 150], [60, 50, 210], [104, 80, 170], [176, 44, 240], [214, 90, 190], [300, 60, 260], [354, 76, 200],
  [424, 56, 230], [474, 90, 180], [560, 50, 250], [604, 84, 205], [682, 60, 235], [736, 96, 175], [826, 54, 255],
  [874, 88, 195], [956, 62, 228], [1012, 80, 185], [1086, 56, 248], [1136, 92, 200], [1222, 58, 238], [1274, 86, 178],
  [1354, 54, 252], [1402, 90, 196], [1486, 64, 230], [1544, 70, 188],
];

// 가까운 아파트 동: [x, 폭, 꼭대기 y, 색]
const NEAR: [number, number, number, string][] = [
  [620, 120, 96, "#f1ece4"], [760, 140, 60, "#e8edf1"], [920, 118, 110, "#efe7dc"], [1060, 150, 74, "#e6ecea"],
  [1230, 124, 120, "#f0e9e1"], [1372, 140, 88, "#e9eef3"], [1530, 110, 130, "#efe8de"],
];

export function HeroScene({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hero-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#7fb8e0" />
          <stop offset="0.6" stopColor="#c9e0ee" />
          <stop offset="1" stopColor="#f6dcbc" />
        </linearGradient>
        <pattern id="hero-win" width="18" height="16" patternUnits="userSpaceOnUse">
          <rect x="4" y="4" width="10" height="7" rx="1.5" fill="#5b7f9b" opacity="0.5" />
        </pattern>
        <pattern id="hero-win-warm" width="18" height="16" patternUnits="userSpaceOnUse">
          <rect x="4" y="4" width="10" height="7" rx="1.5" fill="#8a6a4a" opacity="0.45" />
        </pattern>
      </defs>

      <rect width="1600" height="420" fill="url(#hero-sky)" />
      <circle cx="1180" cy="70" r="40" fill="#fff4cf" opacity="0.85" />
      {[
        [220, 70, 1], [520, 110, 0.8], [1380, 60, 1.1], [900, 40, 0.7],
      ].map(([x, y, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity="0.75">
          <ellipse cx="0" cy="0" rx="60" ry="16" />
          <ellipse cx="30" cy="-10" rx="36" ry="18" />
          <ellipse cx="-28" cy="-6" rx="28" ry="13" />
        </g>
      ))}

      {/* 먼 스카이라인 */}
      <g fill="#a9bfd0" opacity="0.75">
        {FAR.map(([x, w, h]) => (
          <rect key={x} x={x} y={330 - h} width={w} height={h + 10} />
        ))}
      </g>

      {/* 가까운 아파트 */}
      {NEAR.map(([x, w, top, color], i) => (
        <g key={x}>
          <rect x={x} y={top} width={w} height={420 - top} fill={color} />
          <rect x={x} y={top} width={w} height="12" fill={i % 2 ? "#3f6c8a" : "#9a5d3c"} />
          <rect x={x + 8} y={top + 22} width={w - 16} height={360 - top} fill={i % 2 ? "url(#hero-win)" : "url(#hero-win-warm)"} />
          <rect x={x + w - 10} y={top} width="10" height={420 - top} fill="#000" opacity="0.07" />
        </g>
      ))}

      {/* 공원과 나무 */}
      <rect y="352" width="1600" height="68" fill="#79a865" />
      <path d="M0 400 C 300 370, 600 410, 900 385 S 1400 370, 1600 395 V420 H0 Z" fill="#5f9150" />
      {Array.from({ length: 26 }, (_, i) => {
        const x = 20 + i * 62 + (i % 3) * 9;
        const r = 26 + (i % 4) * 6;
        return (
          <g key={i}>
            <rect x={x - 3} y={360 - r * 0.2} width="6" height={r * 0.9} fill="#6b4f33" />
            <circle cx={x} cy={352 - r * 0.6} r={r} fill={i % 2 ? "#3f7a3f" : "#4e8c45"} />
          </g>
        );
      })}
    </svg>
  );
}
