/**
 * 단지 사진 대신 쓰는 그림. 단지 ID 로 색과 건물 배치를 정해서 같은 단지는 늘 같은 그림이 된다.
 * (실제 매물 사진이 없고, 남의 사진을 쓰지 않기 위해 직접 그린다.)
 */

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

const SKIES = [
  ["#9ed0f0", "#f6e3c4"],
  ["#b8dcf2", "#e9f3fb"],
  ["#f3b98f", "#fbe5c8"],
  ["#a7c7e7", "#dde9f4"],
  ["#c9b6e4", "#f4d9d0"],
];
const WALLS = ["#eef0f2", "#f3ede4", "#e2e8ee", "#ece4dc", "#dfe6e2"];
const ACCENTS = ["#3c6e8f", "#8b5e3c", "#4f7a5a", "#7a5c8f", "#9a4f3f"];

export function ComplexThumb({ id, className = "h-[170px] w-full" }: { id: string; className?: string }) {
  const h = hash(id);
  const pick = <T,>(list: T[], shift: number) => list[(h >>> shift) % list.length];
  const [skyTop, skyBottom] = pick(SKIES, 0);
  const wall = pick(WALLS, 3);
  const accent = pick(ACCENTS, 6);
  const gid = `sky-${id}`;
  const pid = `win-${id}`;
  // 동 세 개: 왼쪽 · 가운데(가장 높음) · 오른쪽
  const towers = [
    { x: 30 + ((h >>> 9) % 20), w: 82, top: 58 + ((h >>> 12) % 30) },
    { x: 128 + ((h >>> 15) % 16), w: 96, top: 22 + ((h >>> 18) % 18) },
    { x: 238 + ((h >>> 21) % 18), w: 78, top: 70 + ((h >>> 24) % 30) },
  ];
  return (
    <svg viewBox="0 0 334 170" preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label="단지 그림">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBottom} />
        </linearGradient>
        <pattern id={pid} width="14" height="12" patternUnits="userSpaceOnUse">
          <rect x="3" y="3" width="8" height="5" rx="1" fill={accent} opacity="0.55" />
        </pattern>
      </defs>
      <rect width="334" height="170" fill={`url(#${gid})`} />
      <circle cx={280 - ((h >>> 5) % 120)} cy="30" r="14" fill="#fff6d6" opacity="0.9" />
      {towers.map((t, i) => (
        <g key={i}>
          <rect x={t.x} y={t.top} width={t.w} height={170 - t.top} fill={wall} />
          <rect x={t.x} y={t.top} width={t.w} height="8" fill={accent} />
          <rect x={t.x + 6} y={t.top + 14} width={t.w - 12} height={150 - t.top} fill={`url(#${pid})`} />
          <rect x={t.x + t.w - 6} y={t.top} width="6" height={170 - t.top} fill="#000" opacity="0.06" />
        </g>
      ))}
      <rect y="150" width="334" height="20" fill="#7aa56a" />
      {[18, 70, 118, 226, 290, 318].map((cx, i) => (
        <circle key={cx} cx={cx} cy={150 - (i % 2) * 4} r={14 + (i % 3) * 3} fill={i % 2 ? "#4f8a4b" : "#5f9a52"} />
      ))}
    </svg>
  );
}
