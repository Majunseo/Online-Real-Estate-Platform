import { useEffect, useRef, useState } from "react";
import { activeCount, writeFilter } from "@shared/filters";
import type { RegionsResult, SearchResult } from "@shared/types";
import { useJson } from "@/lib/api";
import { FilterBar } from "./FilterBar";
import { ResultsPanel } from "./ResultsPanel";
import { MapErrorBoundary } from "@/components/map/MapErrorBoundary";
import { MapFallback, RegionMap, type Crumb } from "./map/RegionMap";
import { useSearchState } from "./useSearchState";

const PAGE = 60;
const NONE: never[] = [];

/** 매매 검색. 위에 검색 줄, 왼쪽 지도 · 오른쪽 목록 (좁은 화면에서는 지도 아래 목록) */
export function SearchPage() {
  const { sido, sgg, dong, q, sort, list: conditions, filter, selectRegion, submitQuery, setSort, setList } = useSearchState();
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
      {/* 지역이 바뀌거나 경계를 지우면 검색창도 새로 (예: "서울" 입력 → 서울 선택 뒤 글자가 남지 않게) */}
      <FilterBar key={sido?.code ?? "all"} q={q} placeholder="지역, 시군구, 단지 이름" onSubmit={submitQuery} list={conditions} onList={setList} place={crumbs.map((c) => c.name).join(" ")} />
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
