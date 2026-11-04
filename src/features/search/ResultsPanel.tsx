import { ChevronDown } from "lucide-react";
import type { SearchResult, SortKey } from "@shared/types";
import { ComplexCard, LoadingCard } from "@/components/listing/ComplexCard";
import { SearchTips } from "./SearchTips";
import { SORT_OPTIONS } from "./useSearchState";

interface Props {
  /** 고른 지역 이름 ("전남광주 서구 치평동"), 없으면 빈 글자 */
  place: string;
  /** 지역 · 검색어 · 검색 줄 조건 중 하나라도 있는지 (없으면 도움말을 보여 준다) */
  asked: boolean;
  q: string;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  result: SearchResult | null;
  loading: boolean;
  loadingMore: boolean;
  onMore: () => void;
  /** 고른 시군구가 아직 실거래가를 받지 않은 곳인지 */
  notCollected: boolean;
  error: Error | null;
}

function heading(place: string, q: string, asked: boolean) {
  return [place || (asked ? "전국" : ""), q && `"${q}"`, "아파트 매매"].filter(Boolean).join(" ");
}

function SortMenu({ sort, onSort }: Pick<Props, "sort" | "onSort">) {
  return (
    <label className="relative flex items-center text-[18px] font-bold text-brand">
      <span className="mr-1">정렬:</span>
      <select value={sort} onChange={(e) => onSort(e.target.value as SortKey)} className="cursor-pointer appearance-none bg-transparent pr-7 font-bold text-brand focus:outline-none">
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-0 h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
    </label>
  );
}

/** 오른쪽 목록. 제목 · 건수 · 정렬 · 단지 카드 */
export function ResultsPanel({ place, asked, q, sort, onSort, result, loading, loadingMore, onMore, notCollected, error }: Props) {
  return (
    <section aria-label="검색 결과" className="px-4 py-6 sm:px-7">
      <h1 className="text-[28px] font-extrabold tracking-tight">{heading(place, q, asked)}</h1>

      {!asked && (
        <>
          <p className="mt-4 text-[19px]">지역을 고르면 그 지역 단지가 여기에 떠요.</p>
          <p className="mb-8 mt-1 text-[18px] text-muted">지도에서 시도 → 시군구 → 동 순서로 눌러 들어가거나, 위 검색창에 지역 이름을 입력하세요.</p>
          <SearchTips />
        </>
      )}

      {asked && (
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[18px] font-bold" aria-live="polite">
            {loading ? "찾는 중…" : `${result?.total ?? 0}개 단지`}
          </p>
          <SortMenu sort={sort} onSort={onSort} />
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 rounded-lg bg-tag/10 px-4 py-3 text-tag">
          단지 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}

      {asked && loading && (
        <div className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <LoadingCard key={i} className="w-full" />
          ))}
        </div>
      )}

      {result && result.total > 0 && (
        <ul className="mt-5 grid grid-cols-1 gap-3 xl:grid-cols-2">
          {result.items.map((c) => (
            <li key={c.id}>
              <ComplexCard c={c} className="w-full" />
            </li>
          ))}
        </ul>
      )}

      {result && result.items.length < result.total && (
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-[15px] text-muted">
            {result.total}곳 중 {result.items.length}곳을 보고 있어요. 지도에는 모두 표시돼요.
          </p>
          <button type="button" onClick={onMore} disabled={loadingMore} className="btn-outline">
            {loadingMore ? "불러오는 중…" : "더 보기"}
          </button>
        </div>
      )}

      {result && result.total === 0 && (
        <>
          <p className="mb-8 mt-6 text-[19px]">
            {notCollected
              ? "이 지역은 아직 실거래가를 받아 두지 않았어요. 지도에서 회색인 지역이 그래요."
              : q || !place
                ? "조건에 맞는 단지를 찾지 못했어요. 검색어나 검색 줄 조건을 바꿔 보세요."
                : "이 지역에는 이 기간에 거래된 아파트가 없어요."}
          </p>
          <SearchTips />
        </>
      )}

      <p className="mt-10 border-t border-line pt-4 text-[13px] text-muted">
        {result?.info.months.length
          ? `${result.info.source}. ${result.info.months[0]} ~ ${result.info.months.at(-1)} 계약분, ${result.info.sggCount}개 시군구만 모아 두었어요. `
          : "국토교통부 실거래가 공개 자료 기준이에요. "}
        행정 경계: 통계청 SGIS(공공누리 제1유형), vuski/admdongkor(CC BY 4.0).
      </p>
    </section>
  );
}
