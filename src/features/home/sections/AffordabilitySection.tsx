import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown } from "lucide-react";
import type { Complex, RegionPath } from "@shared/types";
import { SITE } from "@/config/site";
import { useJson } from "@/lib/api";
import { formatManwon } from "@/lib/format";
import { Carousel } from "@/components/ui/Carousel";
import { ComplexCard, LoadingCard, PendingComplexCard } from "@/components/listing/ComplexCard";
import { LogoMark } from "@/components/layout/Logo";
import { BudgetModal } from "@/features/budget/BudgetModal";
import { useBudget } from "@/features/budget/useBudget";
import type { HomeSectionProps } from "../types";

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-[26px] font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-[16px] text-muted">{label}</p>
    </div>
  );
}

/**
 * 예산으로 살 수 있는 단지 찾기: 왼쪽 계산 카드 + 오른쪽 단지 카드 줄.
 * 예산을 넣기 전에는 값이 비어 있고 카드도 내용 없이 보인다. 단추를 누르면 계산 창(BudgetModal)이 뜬다.
 * 예산을 넣으면 관심 지역에서 목표 매매가에 가까운 단지를 보여 준다.
 */
export function AffordabilitySection({ data }: HomeSectionProps) {
  const { input, result, save, savedToAccount } = useBudget();
  const [open, setOpen] = useState(false);
  const picksUrl =
    input && result ? `/api/budget-picks?${new URLSearchParams({ target: String(result.target), max: String(result.max), sido: input.sido, sgg: input.sgg ?? "" })}` : null;
  const picks = useJson<{ region: RegionPath; widened: boolean; items: Complex[] }>(picksUrl);
  const place = [picks.data?.region.sido?.name, picks.data?.widened ? null : picks.data?.region.sgg?.name].filter(Boolean).join(" ");

  return (
    <div className="px-6 pb-6 pt-4 lg:px-14">
      <h2 className="section-title">내 예산으로 살 수 있는 단지 찾기</h2>
      <p className="section-sub">
        {result ? `${place || "관심 지역"}에서 목표 매매가에 가까운 단지예요.${picks.data?.widened ? " (고른 시군구에 맞는 단지가 없어 시도 전체에서 찾았어요)" : ""}` : "몇 가지만 답하면 살 수 있을 것 같은 단지를 표시해 드려요."}
      </p>
      <div className="mt-8 flex flex-col gap-6 lg:flex-row">
        <div className="w-full shrink-0 lg:w-[380px]">
          <div className="rounded-2xl border-2 border-line p-7">
            <p className="flex items-center gap-1.5 text-[17px] font-bold">
              <LogoMark className="h-5 w-5" /> {SITE.loanName}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-y-6">
              <Metric value={result ? formatManwon(result.target) : "-- 원"} label="목표 매매가" />
              <Metric value={result ? formatManwon(result.max) : "-- 원"} label="최대 매매가" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              <Metric value={result ? `${result.targetMonthly.toLocaleString("ko-KR")}만` : "--/월"} label="월 상환액" />
              <Metric value={input ? `${input.rate}%` : "-- %"} label="예상 금리" />
              <Metric value={input ? `${input.years}년` : "-- 년"} label="대출 기간" />
            </div>
          </div>
          <button type="button" onClick={() => setOpen(true)} className="btn-primary mt-6 h-[56px] w-full text-[19px]">
            {result ? "내 예산 다시 계산하기" : "내 구매 가능 금액 알아보기"}
          </button>
        </div>
        <div className="min-w-0 flex-1">
          <Carousel label="예산 안 단지">
            {!result
              ? data
                ? data.budget.map((c) => <PendingComplexCard key={c.id} c={c} />)
                : Array.from({ length: 3 }, (_, i) => <LoadingCard key={i} />)
              : picks.data
                ? picks.data.items.length
                  ? picks.data.items.map((c) => <ComplexCard key={c.id} c={c} />)
                  : [<p key="none" className="w-full py-16 text-center text-muted">이 가격대에 맞는 단지가 아직 없어요. 지역을 넓혀 보세요.</p>]
                : Array.from({ length: 3 }, (_, i) => <LoadingCard key={i} />)}
          </Carousel>
        </div>
      </div>
      <div className="mt-10 text-center">
        <Link
          to={
            input && result
              ? `/search?${new URLSearchParams({ sido: input.sido, ...(input.sgg ? { sgg: input.sgg } : {}), priceMax: String(result.max) })}`
              : data?.regional.sggCode
                ? `/search?${new URLSearchParams({ sgg: data.regional.sggCode })}`
                : "/search"
          }
          className="inline-flex items-center gap-2 text-[20px] font-bold text-brand hover:underline"
        >
          <ArrowDown className="h-5 w-5" aria-hidden="true" /> {result ? "예산 안 단지 지도에서 더 보기" : "추천 단지 더 보기"}
        </Link>
      </div>
      {open && <BudgetModal initial={input} savedToAccount={savedToAccount} onSave={save} onClose={() => setOpen(false)} />}
    </div>
  );
}
