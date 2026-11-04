import type { Deal } from "@shared/types";
import { formatDate, formatShortPrice } from "@/lib/format";

/**
 * 한 면적의 거래가를 날짜 순서로 찍은 그림 (점 + 선). 계약 해제 거래는 빼고, 거래가 하나면 점 하나.
 * 세로축은 가장 낮은 값 ~ 가장 높은 값에 여백을 두고, 가로축은 기간 처음 ~ 끝 날짜.
 */
export function PriceChart({ deals, title }: { deals: Deal[]; title: string }) {
  const points = deals.filter((d) => !d.canceled).sort((a, b) => a.date.localeCompare(b.date));
  if (!points.length) return <p className="py-10 text-center text-muted">이 면적은 기간 안에 유효한 거래가 없어요.</p>;

  const W = 640;
  const H = 220;
  const PAD = { l: 64, r: 16, t: 16, b: 32 };
  const times = points.map((d) => Date.parse(d.date));
  const t0 = Math.min(...times);
  const t1 = Math.max(...times);
  const lo = Math.min(...points.map((d) => d.amount));
  const hi = Math.max(...points.map((d) => d.amount));
  const span = hi - lo || hi * 0.1;
  const yMin = lo - span * 0.15;
  const yMax = hi + span * 0.15;
  const x = (t: number) => PAD.l + (t1 === t0 ? (W - PAD.l - PAD.r) / 2 : ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r));
  const y = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const ticks = [yMax, (yMax + yMin) / 2, yMin];

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${title} 거래가 흐름: ${points.length}건, 최저 ${formatShortPrice(lo)} 최고 ${formatShortPrice(hi)}`}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="stroke-line" strokeDasharray="3 4" />
            <text x={PAD.l - 8} y={y(v) + 4} textAnchor="end" className="fill-muted text-[12px]">
              {formatShortPrice(Math.round(v / 100) * 100)}
            </text>
          </g>
        ))}
        <text x={PAD.l} y={H - 8} className="fill-muted text-[12px]">
          {formatDate(points[0].date)}
        </text>
        <text x={W - PAD.r} y={H - 8} textAnchor="end" className="fill-muted text-[12px]">
          {formatDate(points.at(-1)!.date)}
        </text>
        {points.length > 1 && (
          <polyline points={points.map((d) => `${x(Date.parse(d.date))},${y(d.amount)}`).join(" ")} fill="none" className="stroke-brand" strokeWidth="2.5" />
        )}
        {points.map((d, i) => (
          <circle key={i} cx={x(Date.parse(d.date))} cy={y(d.amount)} r="5" className="fill-surface stroke-brand" strokeWidth="2.5">
            <title>{`${formatDate(d.date)} · ${formatShortPrice(d.amount)} · ${d.floor}층`}</title>
          </circle>
        ))}
      </svg>
    </figure>
  );
}
