import { Link } from "react-router-dom";
import { TrainFront } from "lucide-react";
import { STATION_RADIUS_M } from "@shared/filters";
import type { Complex } from "@shared/types";
import { formatDate, formatManwon, formatUnitPrice, toPyeong } from "@/lib/format";
import { SkeletonBar, SkeletonLines } from "@/components/ui/Skeleton";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import { ComplexThumb } from "./ComplexThumb";
import { bugOn } from "@/lib/bugs";

const CARD_WIDTH = "w-[334px]";

/** [U3] 결함: 카드 한 줄에 주소까지 보이게 하려고 단지 이름을 12자에서 자른다. "…1차 · 2차 · 3차" 같은 뒤쪽 구분자가 사라져 다른 단지가 같은 이름으로 보인다 */
const NAME_MAX = 12;
const cardName = (name: string) => (bugOn("U3") && name.length > NAME_MAX ? `${name.slice(0, NAME_MAX)}…` : name);

function Badge({ label }: { label: string }) {
  return <span className="absolute left-3 top-3 rounded-full bg-tag px-3 py-0.5 text-[15px] font-bold text-white">{label}</span>;
}

/** 사진 왼쪽 아래: 역세권(역 500m 안)일 때만 가장 가까운 역과 거리 */
function StationChip({ c }: { c: Complex }) {
  if (!c.station || c.station.distanceM > STATION_RADIUS_M) return null;
  return (
    <span className="absolute bottom-2 left-3 inline-flex items-center gap-1 rounded-full bg-ink/80 px-2.5 py-0.5 text-[13px] font-bold text-white">
      <TrainFront className="h-3.5 w-3.5" aria-hidden="true" />
      역세권 · {c.station.name}역 {c.station.distanceM}m
    </span>
  );
}

function Specs({ c }: { c: Complex }) {
  // [U1] 결함: 숫자는 맞는데 단위 글자가 서로 바뀐다 ("전용 84평 · 25.5㎡")
  const [m2Unit, pyUnit] = bugOn("U1") ? ["평", "㎡"] : ["㎡", "평"];
  const parts = [
    <>
      전용&nbsp;<b>{Math.round(c.latest.areaM2)}</b>{m2Unit}
    </>,
    <>
      <b>{toPyeong(c.latest.areaM2)}</b>{pyUnit}
    </>,
    <>{c.latest.floor}층</>,
    <>{c.buildYear}년</>,
  ];
  return (
    <p className="mt-1 flex flex-wrap items-center text-[17px] text-ink">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center">
          {i > 0 && <span className="mx-2 h-4 w-px bg-line" aria-hidden="true" />}
          {p}
        </span>
      ))}
    </p>
  );
}

/**
 * 단지 카드 한 장. 사진 · 표시 · 최근 실거래가 · 면적 · 주소 · 출처. 줄 넘김 목록에서는 className 으로 폭을 바꾼다.
 * 카드 전체가 상세로 가는 링크이고, 하트 단추는 링크 밖에 겹쳐 둔다 (링크 안에 단추를 넣지 않는다).
 */
export function ComplexCard({ c, className = CARD_WIDTH }: { c: Complex; className?: string }) {
  return (
    <div className={`card group relative shrink-0 snap-start ${className}`}>
      <Link to={`/complex/${c.id}`} className="block">
        <div className="relative">
          <ComplexThumb id={c.id} />
          {c.badge && <Badge label={c.badge.label} />}
          <StationChip c={c} />
        </div>
        <div className="px-3 pb-3 pt-2.5">
          <p className="text-[25px] font-extrabold tracking-tight">{formatManwon(c.latest.amount)}</p>
          <p className="text-[14px] text-muted">{formatUnitPrice(c.latest.amount, c.latest.areaM2)}</p>
          <Specs c={c} />
          <p className="mt-2 truncate text-[17px] text-ink group-hover:underline">
            {cardName(c.name)}, {c.sido} {c.sgg} {c.umd} {c.jibun}
          </p>
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-muted">
            최근 실거래 {formatDate(c.latest.date)} · {c.latest.dealingType} · 기간 내 거래 {c.dealCount}건. 국토교통부 실거래가 공개 자료 기준이에요.
          </p>
        </div>
      </Link>
      <div className="absolute right-3 top-3">
        <FavoriteButton complexId={c.id} name={c.name} />
      </div>
    </div>
  );
}

/** 사진과 표시만 있고 본문은 아직 비어 있는 카드 (예산을 입력하기 전) */
export function PendingComplexCard({ c }: { c: Complex }) {
  return (
    <div className={`card shrink-0 snap-start ${CARD_WIDTH}`} aria-label={`${c.name} — 예산을 입력하면 정보가 보여요`}>
      <div className="relative">
        <ComplexThumb id={c.id} />
        {c.badge && <Badge label={c.badge.label} />}
      </div>
      <SkeletonLines />
    </div>
  );
}

/** 불러오는 중인 카드 */
export function LoadingCard({ className = CARD_WIDTH }: { className?: string }) {
  return (
    <div className={`card shrink-0 ${className}`} aria-hidden="true">
      <div className="h-[170px] animate-pulse bg-band" />
      <div className="space-y-3 px-3 py-4">
        <SkeletonBar className="h-7 w-1/2 animate-pulse" />
        <SkeletonBar className="w-3/4 animate-pulse" />
        <SkeletonBar className="w-5/6 animate-pulse" />
      </div>
    </div>
  );
}
