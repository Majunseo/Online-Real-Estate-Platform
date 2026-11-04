/** 안내 카드 세 장의 그림 (직접 그린 단순 일러스트) */

export type ActionArtKind = "buy" | "price" | "sell";

function Blob() {
  return <circle cx="100" cy="100" r="88" fill="#fbecd9" />;
}

/** 중개사와 상담하는 두 사람 */
function Buy() {
  return (
    <>
      <Blob />
      <rect x="92" y="34" width="70" height="56" rx="12" fill="#f5b49a" />
      <path d="M110 90 l-6 12 l16 -12z" fill="#f5b49a" />
      <circle cx="127" cy="52" r="13" fill="#6b3f2a" />
      <rect x="110" y="66" width="34" height="40" rx="10" fill="#2f3e8f" />
      <circle cx="74" cy="104" r="16" fill="#3b2a20" />
      <rect x="50" y="122" width="48" height="58" rx="16" fill="#2f6a52" />
      <rect x="96" y="128" width="22" height="34" rx="4" fill="#1d1d1d" />
      <path d="M126 140 q10 6 0 14 M134 134 q16 12 0 26" stroke="#2f3e8f" strokeWidth="3" fill="none" />
    </>
  );
}

/** 실거래가 막대와 아파트 */
function Price() {
  return (
    <>
      <Blob />
      <rect x="54" y="66" width="56" height="112" fill="#e9967a" />
      <rect x="54" y="60" width="56" height="10" fill="#2d2d2d" />
      {[0, 1, 2, 3].map((r) =>
        [0, 1].map((c) => <rect key={`${r}${c}`} x={64 + c * 22} y={80 + r * 22} width="14" height="14" fill="#fbe7d6" />),
      )}
      <rect x="72" y="156" width="20" height="22" fill="#c98a2c" />
      <rect x="120" y="128" width="16" height="50" rx="3" fill="#2f6a52" />
      <rect x="140" y="104" width="16" height="74" rx="3" fill="#2f6a52" />
      <rect x="160" y="84" width="16" height="94" rx="3" fill="#2f3e8f" />
      <path d="M118 120 L148 96 L168 78" stroke="#c4441e" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="100" cy="180" rx="80" ry="6" fill="#2f6a52" opacity="0.6" />
    </>
  );
}

/** 집 그림이 걸린 매매 표지판 */
function Sell() {
  return (
    <>
      <Blob />
      <rect x="44" y="40" width="10" height="140" fill="#c98a2c" />
      <rect x="44" y="40" width="96" height="10" fill="#c98a2c" />
      <rect x="84" y="62" width="70" height="62" rx="4" fill="#2f3e8f" />
      <path d="M100 98 l19 -16 l19 16 v18 h-38z" fill="#6cc5e8" />
      <path d="M112 102 q7 -8 14 0 q-7 8 -14 0z" fill="#fff" />
      <rect x="132" y="120" width="44" height="40" fill="#f2c14e" />
      <path d="M128 122 l26 -20 l26 20z" fill="#e98b2a" />
      <path d="M60 180 L170 150 L176 160 L66 190z" fill="#c4441e" opacity="0.85" />
      <ellipse cx="80" cy="182" rx="50" ry="10" fill="#2f6a52" />
    </>
  );
}

const ART = { buy: Buy, price: Price, sell: Sell };

export function ActionArt({ kind, className = "h-[190px] w-[190px]" }: { kind: ActionArtKind; className?: string }) {
  const Art = ART[kind];
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <Art />
    </svg>
  );
}
