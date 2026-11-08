import { useEffect, useRef } from "react";
import { useNavigate, useNavigationType } from "react-router-dom";
import { ChevronRight, MapPinOff, Minus, Plus, X } from "lucide-react";
import type { BubbleLevel, PointsResult, RegionBubble, RegionRef, StationsResult, SummaryResult } from "@shared/types";
import type { ListFilter } from "@shared/filters";
import { useJson } from "@/lib/api";
import { SIDO } from "@shared/regions";
import { SchoolMenu } from "./SchoolMenu";
import { KOREA_VIEW } from "./sidoStyle";
import { useBoundaryLayer } from "./useBoundaryLayer";
import { useClusteredMarkers } from "./useClusteredMarkers";
import { useNaverMap } from "./useNaverMap";
import { useRegionBubbles } from "./useRegionBubbles";
import { useStationMarkers } from "./useStationMarkers";

export type ChildRegion = RegionRef & { count: number };

export interface Crumb {
  code: string;
  name: string;
}

interface Props {
  /** 고른 지역 코드 (없으면 null) */
  sido: string | null;
  sgg: string | null;
  dong: string | null;
  /** 지역 경로 표시: 전국 › 시도 › 시군구 › 동 */
  crumbs: Crumb[];
  /** 고른 시도의 시군구 · 고른 시군구의 동, 각 단지 수 (0 이면 회색) */
  sggList: ChildRegion[];
  dongList: ChildRegion[];
  /** 검색 조건 주소 (sido · sgg · dong · q · 검색 줄 조건). 지도가 이 조건으로 묶음 · 핀을 받아 온다 */
  query: string;
  total: number | null;
  onSelect: (code: string | null) => void;
  /** 검색 줄 조건. 지도 위 "학교" 단추가 학교 조건을 바꾼다 */
  list: ListFilter;
  onList: (list: ListFilter) => void;
}

const NO_POINTS: PointsResult["points"] = [];
const NO_BUBBLES: RegionBubble[] = [];
const NO_STATIONS: StationsResult["stations"] = [];
/** 이만큼 확대하면 지역 묶음 대신 단지별 가격 핀을 보여 준다 (동을 고르면 확대와 상관없이 핀) */
const PIN_ZOOM = 15;
const overlayButton = "pointer-events-auto flex items-center gap-2 rounded-lg border-[1.5px] bg-surface px-4 text-[17px] font-bold shadow-sm hover:bg-band";

/**
 * 이용자가 마지막으로 보던 지도 위치 · 확대. 지역마다 따로 sessionStorage 에 두어,
 * 단지 상세에 갔다가 뒤로 오거나 새로 고침했을 때(POP) 지역 경계에 다시 맞추지 않고 보던 화면으로 돌아온다.
 */
interface MapView {
  lat: number;
  lng: number;
  zoom: number;
}
const viewKey = (deepest: string | null) => `jipteo.map-view:${deepest ?? "all"}`;
function readView(key: string): MapView | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(key) ?? "null");
    return v && Number.isFinite(v.lat) && Number.isFinite(v.lng) && Number.isFinite(v.zoom) ? v : null;
  } catch {
    return null;
  }
}
function writeView(key: string, v: MapView) {
  try {
    sessionStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* 저장 공간이 막혀 있으면 기억하지 않는다 */
  }
}

/**
 * 왼쪽 지도. 시도 → 시군구 → 동 순서로 경계를 눌러 들어가고, 고른 곳은 파란 얇은 테두리로 보여 준다.
 * 단지는 한 단계 아래 지역별로 묶어 "치평동 18곳 · 2.6억" 처럼 보여 준다 (누르면 그 지역으로).
 *   전국 → 묶음 없음 (시도는 경계 · 이름이 지도에 이미 보인다. 검색어 · 조건으로 찾을 때만 단지 핀)
 *   시도 → 시군구 묶음 · 시군구 → 동 묶음 · 동(또는 많이 확대) → 단지별 가격 핀
 */
export function RegionMap({ sido, sgg, dong, crumbs, sggList, dongList, query, total, onSelect, list, onList }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { status, maps, map, zoomBy, zoom } = useNaverMap(box);
  const ready = status === "ready";

  const level: BubbleLevel | null = dong ? null : sgg ? "dong" : sido ? "sgg" : null;
  // 지역을 안 골랐으면 검색어 · 조건이 있을 때만(query 가 있을 때만) 핀을 보여 준다
  const pins = Boolean(dong) || zoom >= PIN_ZOOM || (!sido && query !== "");
  const and = query ? `${query}&` : "";
  const summary = useJson<SummaryResult>(!pins && level ? `/api/complexes/summary?${and}level=${level}` : null);
  const points = useJson<PointsResult>(pins && (sido || query) ? `/api/complexes/points?${query}` : null);

  const sggCount = new Map(sggList.map((r) => [r.code, r.count]));

  const sidoLayer = useBoundaryLayer({
    ready, maps, map, layer: "sido", url: "/geo/sido.json",
    stateOf: (code) => (code === sido ? (sgg ? "ancestor" : "selected") : "idle"),
    onSelect,
  });
  const sggLayer = useBoundaryLayer({
    ready, maps, map, layer: "sgg", url: sido ? `/geo/sgg/${sido}.json` : null,
    stateOf: (code) => (code === sgg ? (dong ? "ancestor" : "selected") : sggCount.get(code) === 0 ? "empty" : "idle"),
    onSelect,
  });
  const dongLayer = useBoundaryLayer({
    ready, maps, map, layer: "dong", url: sgg ? `/geo/dong/${sgg}.json` : null,
    // 동은 거래가 없어도 회색으로 두지 않는다 (회색은 "아직 받지 않은 시군구" 표시)
    stateOf: (code) => (code === dong ? "selected" : "idle"),
    onSelect,
  });

  useRegionBubbles(ready, maps, map, pins ? NO_BUBBLES : (summary.data?.items ?? NO_BUBBLES), level === "dong", onSelect);
  useClusteredMarkers(ready, maps, map, pins ? (points.data?.points ?? NO_POINTS) : NO_POINTS, (id) => navigate(`/complex/${id}`));
  // 역세권 조건을 걸었을 때만, 조건에 맞는 단지들이 기대는 지하철역을 보여 준다
  const nearStation = new URLSearchParams(query).get("near") === "station";
  const stations = useJson<StationsResult>(nearStation ? `/api/stations?${query}` : null);
  useStationMarkers(ready, maps, map, stations.data?.stations ?? NO_STATIONS);

  // 고른 가장 아래 단계에 화면을 맞춘다. 그 층의 경계 파일이 그려진 뒤에 한 번만.
  const deepest = dong ?? sgg ?? sido;
  const deepestLayer = dong ? dongLayer : sgg ? sggLayer : sidoLayer;
  const fitted = useRef<string | null | undefined>(undefined);
  const navType = useNavigationType();

  // 지도가 멈출 때마다(idle) 지금 지역의 보던 화면을 기억한다. 경계에 맞추는 중(fitted 가 아직 아님)에는 기억하지 않는다
  const deepestRef = useRef(deepest);
  deepestRef.current = deepest;
  useEffect(() => {
    if (!ready || !map.current || !maps.current) return;
    const m = maps.current;
    const listener = m.Event.addListener(map.current, "idle", () => {
      if (!map.current || fitted.current !== deepestRef.current) return;
      const c = map.current.getCenter();
      writeView(viewKey(deepestRef.current), { lat: typeof c.lat === "function" ? c.lat() : c.y, lng: typeof c.lng === "function" ? c.lng() : c.x, zoom: map.current.getZoom() });
    });
    return () => m.Event.removeListener(listener);
  }, [ready, map, maps]);

  useEffect(() => {
    if (!ready || fitted.current === deepest) return;
    // 뒤로 가기 · 새로 고침으로 돌아왔으면 이 지역에서 마지막으로 보던 화면으로
    const saved = navType === "POP" ? readView(viewKey(deepest)) : null;
    if (saved) {
      map.current?.setCenter(new maps.current.LatLng(saved.lat, saved.lng));
      map.current?.setZoom(saved.zoom);
      fitted.current = deepest;
      return;
    }
    if (!deepest) {
      map.current?.morph(new maps.current.LatLng(KOREA_VIEW.lat, KOREA_VIEW.lng), KOREA_VIEW.zoom);
      fitted.current = null;
      return;
    }
    // 시군구를 고르면 경계 전체가 아니라 동 묶음(단지가 있는 곳)이 모인 범위에 맞춘다.
    // 경계에는 산 · 논밭처럼 빈 땅이 많아 전체에 맞추면 동 묶음이 작게 몰려 서로 합쳐져 버린다.
    if (level === "dong" && summary.loading) return;
    const spots = level === "dong" ? (summary.data?.items ?? []) : [];
    const m = maps.current;
    if (spots.length >= 2) {
      const lats = spots.map((s) => s.lat);
      const lngs = spots.map((s) => s.lng);
      map.current?.fitBounds(new m.LatLngBounds(new m.LatLng(Math.min(...lats), Math.min(...lngs)), new m.LatLng(Math.max(...lats), Math.max(...lngs))), { top: 110, right: 70, bottom: 60, left: 70 });
      // 너무 가까이 들어가 단지 핀으로 넘어가지 않게
      if (map.current?.getZoom() >= PIN_ZOOM) map.current.setZoom(PIN_ZOOM - 1);
    } else {
      const bounds = deepestLayer.loaded ? deepestLayer.boundsOf(deepest) : undefined;
      if (!bounds) return;
      map.current?.fitBounds(bounds, { top: 80, right: 40, bottom: 40, left: 40 });
    }
    fitted.current = deepest;
  });

  if (status === "error") return <MapFallback crumbs={crumbs} sido={sido} sgg={sgg} dong={dong} sggList={sggList} dongList={dongList} onSelect={onSelect} />;

  return (
    <section aria-label="지도" className="relative h-full w-full bg-band">
      {/* 네이버 지도가 이 상자의 position 을 relative 로 바꾸므로 inset 대신 크기를 준다 */}
      <div ref={box} className="h-full w-full" />

      {/* 좁은 화면에서는 지역 경로 아래에 단추가 내려온다 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col items-start gap-2 p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:p-4">
        <div className="pointer-events-auto max-w-full rounded-lg bg-ink/75 px-4 py-2.5 text-white">
          <Breadcrumbs crumbs={crumbs} onSelect={onSelect} />
          <p className="mt-0.5 text-[15px] text-white/85">{deepest ? `단지 ${total ?? "…"}곳` : "지도에서 시도를 눌러 보세요"}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
          <SchoolMenu list={list} onList={onList} buttonClassName="pointer-events-auto flex h-12 shrink-0 items-center gap-2 rounded-lg border-[1.5px] px-4 text-[17px] font-bold shadow-sm hover:bg-band" />
          {deepest && (
            <button type="button" onClick={() => onSelect(null)} className={`${overlayButton} h-12 shrink-0 border-brand`}>
              경계 지우기
              <X className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      <div className="absolute bottom-6 right-6 flex flex-col gap-3">
        <button type="button" aria-label="지도 확대" onClick={() => zoomBy(1)} className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-muted/60 bg-surface shadow-sm hover:bg-band">
          <Plus className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
        </button>
        <button type="button" aria-label="지도 축소" onClick={() => zoomBy(-1)} className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-muted/60 bg-surface shadow-sm hover:bg-band">
          <Minus className="h-6 w-6" strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>

      {status === "loading" && <p className="absolute inset-0 flex items-center justify-center text-muted">지도를 불러오는 중…</p>}
    </section>
  );
}

/** 전국 › 전남광주 › 서구 › 치평동. 앞 단계를 누르면 그 단계로 돌아간다 */
function Breadcrumbs({ crumbs, onSelect }: Pick<Props, "crumbs" | "onSelect">) {
  const all: (Crumb | { code: null; name: string })[] = [{ code: null, name: "전국" }, ...crumbs];
  return (
    <nav aria-label="지역 경로">
      <ol className="flex flex-wrap items-center gap-1 text-[17px] font-bold">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={c.code ?? "all"} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-4 w-4 text-white/60" aria-hidden="true" />}
              {last ? (
                <span aria-current="location">{c.name}</span>
              ) : (
                <button type="button" onClick={() => onSelect(c.code)} className="font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline">
                  {c.name}
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** 지도 키가 없거나 인증이 실패했을 때: 단계별 단추로 대신 고른다 (지도 오류 울타리도 이 화면을 쓴다) */
export function MapFallback({ crumbs, sido, sgg, dong, sggList, dongList, onSelect }: Omit<Props, "query" | "total" | "list" | "onList">) {
  const options: ChildRegion[] = sgg ? dongList : sido ? sggList : SIDO.map((s) => ({ code: s.code, name: s.short, count: 1 }));
  const current = dong ?? sgg ?? sido;
  return (
    <section aria-label="지역 선택" className="flex h-full flex-col items-center justify-center bg-band px-6 py-10 text-center">
      <MapPinOff className="h-12 w-12 text-muted" aria-hidden="true" />
      <p className="mt-4 text-lg font-bold">지도를 불러오지 못했어요</p>
      <p className="mt-1 text-muted">아래에서 지역을 골라 주세요.</p>
      <div className="mt-4 rounded-lg bg-ink/75 px-4 py-2 text-white">
        <Breadcrumbs crumbs={crumbs} onSelect={onSelect} />
      </div>
      <ul className="mt-5 grid max-w-lg grid-cols-3 gap-2 sm:grid-cols-5">
        {options.map((r) => (
          <li key={r.code}>
            <button
              type="button"
              aria-pressed={current === r.code}
              onClick={() => onSelect(r.code)}
              className="w-full rounded-lg border border-line bg-surface px-2 py-2 text-[15px] hover:border-brand disabled:text-muted aria-pressed:border-boundary aria-pressed:font-bold aria-pressed:text-boundary"
            >
              {r.name}
              {r.count === 0 && <span className="block text-[12px] text-muted">자료 없음</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
