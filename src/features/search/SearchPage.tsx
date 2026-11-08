import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { activeCount, writeFilter } from "@shared/filters";
import type { RegionsResult, SearchResult } from "@shared/types";
import { getJson, useJson } from "@/lib/api";
import { matchRegion, targetOf, type Suggestion } from "@/components/search/SuggestSearch";
import { FilterBar } from "./FilterBar";
import { ResultsPanel } from "./ResultsPanel";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { MapFallback, RegionMap, type Crumb } from "./map/RegionMap";
import { useSearchState } from "./useSearchState";

const PAGE = 60;
const NONE: never[] = [];

/** 매매 검색. 위에 검색 줄, 왼쪽 지도 · 오른쪽 목록 (좁은 화면에서는 지도 아래 목록) */
export function SearchPage() {
  const navigate = useNavigate();
  const { sido, sgg, dong, q, sort, list: conditions, filter, selectRegion, submitQuery, setSort, setList } = useSearchState();

  /** 자동완성 후보: 지역이면 지도가 그 경계로 들어가고, 단지면 단지 상세로 간다 */
  const pick = (s: Suggestion) => (s.kind === "complex" ? navigate(targetOf(s)) : selectRegion(s.code));

  /**
   * 글자로 제출: "수지구" · "용인시 수지구" 처럼 시군구 · 동 이름 그대로면 그 경계로 들어간다 (같은 이름이 여럿이면 지금 시도 안의 것).
   * 지역 이름이 아니면 단지 이름 검색어로 쓴다. 후보를 받지 못해도 검색어로는 간다.
   */
  const submit = async (text: string) => {
    const t = text.trim();
    if (t) {
      const items = await getJson<{ items: Suggestion[] }>(`/api/suggest?q=${encodeURIComponent(t)}`).then((r) => r.items, () => []);
      const region = matchRegion(items, t, sido?.code);
      if (region) return selectRegion(region.code);
    }
    submitQuery(t);
  };
  // 지역 · 검색어가 없어도 검색 줄 조건을 걸면 전국에서 찾는다
  const asked = Boolean(sido || q || activeCount(conditions) > 0);

  const where = new URLSearchParams();
  if (filter.sido) where.set("sido", filter.sido);
  if (filter.sgg) where.set("sgg", filter.sgg);
  if (filter.dong) where.set("dong", filter.dong);
  if (q) where.set("q", q);
  writeFilter(where, conditions);

  // 조건이 바뀌면 처음 60곳부터. "더 보기" 는 같은 조건에서 limit 만 늘린다.
  const queryKey = `${where}|${sort}`;
  const [limit, setLimit] = useState({ key: queryKey, n: PAGE });
  const n = limit.key === queryKey ? limit.n : PAGE;
  useEffect(() => setLimit({ key: queryKey, n: PAGE }), [queryKey]);

  const list = useJson<SearchResult>(asked ? `/api/complexes?${where}&sort=${sort}&limit=${n}` : null);
  const sggList = useJson<RegionsResult>(sido ? `/api/regions?sido=${sido.code}` : null);
  const dongList = useJson<RegionsResult>(sgg ? `/api/regions?sgg=${sgg}` : null);

  // 더 보기를 누르는 동안에는 이미 받은 목록을 그대로 둔다
  const last = useRef<{ key: string; data: SearchResult } | null>(null);
  if (list.data) last.current = { key: queryKey, data: list.data };
  const shown = list.data ?? (last.current?.key === queryKey ? last.current.data : null);
  const loadingMore = list.loading && shown !== null;

  // 지역 경로 이름: 시도는 고정 목록, 시군구 · 동은 지역 목록 응답에서
  const sggName = sggList.data?.items.find((r) => r.code === sgg)?.name;
  const dongName = dongList.data?.items.find((r) => r.code === dong)?.name;
  const crumbs: Crumb[] = [
    sido && { code: sido.code, name: sido.short },
    sgg && { code: sgg, name: sggName ?? "…" },
    dong && { code: dong, name: dongName ?? "…" },
  ].filter((c): c is Crumb => Boolean(c));

  // 단지가 0곳일 때: 아직 실거래가를 받지 않은 시군구인지
  const notCollected = Boolean(sgg && sggList.data?.items.find((r) => r.code === sgg)?.count === 0);

  return (
    <div className="flex h-full flex-col">
      {/* 지역이 바뀌거나 경계를 지우면 검색창도 새로 (예: "수지구" 입력 → 수지구 선택 뒤 글자가 남지 않게. 고른 지역은 지도 위 경로에 보인다) */}
      <FilterBar key={dong ?? sgg ?? sido?.code ?? "all"} q={q} placeholder="지역, 시군구, 단지 이름" onSubmit={submit} onPick={pick} list={conditions} onList={setList} place={crumbs.map((c) => c.name).join(" ")} />
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <div className="h-[48vh] shrink-0 border-b border-line lg:h-auto lg:w-[45%] lg:border-b-0 lg:border-r">
          {/* 지도 스크립트가 오류를 던져도 이 영역만 지역 단추 화면으로 바뀌게 한다 */}
          <MapErrorBoundary
            fallback={
              <MapFallback
                sido={sido?.code ?? null}
                sgg={sgg}
                dong={dong}
                crumbs={crumbs}
                sggList={sggList.data?.items ?? NONE}
                dongList={dongList.data?.items ?? NONE}
                onSelect={selectRegion}
              />
            }
          >
            <RegionMap
              sido={sido?.code ?? null}
              sgg={sgg}
              dong={dong}
              crumbs={crumbs}
              sggList={sggList.data?.items ?? NONE}
              dongList={dongList.data?.items ?? NONE}
              query={where.toString()}
              total={shown?.total ?? null}
              onSelect={selectRegion}
              list={conditions}
              onList={setList}
            />
          </MapErrorBoundary>
        </div>
        <div className="lg:min-w-0 lg:flex-1 lg:overflow-y-auto">
          <ResultsPanel
            place={crumbs.map((c) => c.name).join(" ")}
            asked={asked}
            q={q}
            sort={sort}
            onSort={setSort}
            result={shown}
            loading={list.loading && !loadingMore}
            loadingMore={loadingMore}
            onMore={() => setLimit({ key: queryKey, n: n + PAGE })}
            notCollected={notCollected}
            error={list.error}
          />
        </div>
      </div>
    </div>
  );
}
