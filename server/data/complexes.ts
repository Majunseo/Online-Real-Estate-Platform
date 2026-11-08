import fs from "fs";
import path from "path";
import type { Badge, BubbleLevel, BuildingInfo, Complex, Deal, PointsResult, RegionPath, RegionsResult, SearchFilter, SearchResult, SortKey, StationsResult, SummaryResult } from "../../shared/types";
import type { Snapshot, SnapshotComplex } from "../../shared/snapshot";
import { matchesFilter, STATION_RADIUS_M } from "../../shared/filters";
import { formatManwon } from "../../shared/format";
import { sidoByCode } from "../../shared/regions";
import { dongAreas, locate, sggAreas } from "./geo";
import { nearSchools } from "./schools";
import { nearestStation, stationKey, stationPoints } from "./stations";

/**
 * 단지 자료. 국토교통부 실거래가 스냅숏(server/data/molit/snapshot.json)을 켜질 때 한 번 읽는다.
 * 스냅숏은 npm run fetch:molit 으로 만든다. 화면 요청마다 공공데이터 API 를 부르지 않으므로
 * 결과가 늘 같고(/_reset 으로 되돌릴 것도 없다), API 일일 한도와 응답 속도에 묶이지 않는다.
 */
const SNAPSHOT_FILE = path.resolve(process.cwd(), "server/data/molit/snapshot.json");

function loadSnapshot(): Snapshot | null {
  if (!fs.existsSync(SNAPSHOT_FILE)) {
    console.warn("[jipteo] 실거래가 스냅숏이 없어요. npm run fetch:molit 을 먼저 돌려 주세요.");
    return null;
  }
  return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf-8")) as Snapshot;
}

const snapshot = loadSnapshot();

/** 건축물대장 요약 (npm run fetch:buildings 이 만든다). 없으면 단지에 building 이 붙지 않는다 */
const BUILDINGS_FILE = path.resolve(process.cwd(), "server/data/molit/buildings.json");
const buildings: Record<string, BuildingInfo | null> = fs.existsSync(BUILDINGS_FILE) ? JSON.parse(fs.readFileSync(BUILDINGS_FILE, "utf-8")) : {};
/** 스냅숏에서 가장 최근 계약일 ("최근 한 달" · "새 거래" 의 기준) */
export const newestDate = snapshot?.complexes.reduce((max, c) => (c.deals[0].date > max ? c.deals[0].date : max), "") ?? "";

const won = (manwon: number) => (manwon % 10000 === 0 || manwon < 10000 ? formatManwon(manwon) : `${formatManwon(manwon)}만`);
const sameArea = (a: Deal, b: Deal) => Math.round(a.areaM2) === Math.round(b.areaM2);
const daysBetween = (a: string, b: string) => (Date.parse(a) - Date.parse(b)) / 86_400_000;

/** 카드 왼쪽 위 표시. 스냅숏 안의 같은 면적 거래끼리만 비교한다. */
function badgeFor(latest: Deal, deals: Deal[]): Badge | undefined {
  const peers = deals.filter((d) => !d.canceled && d !== latest && sameArea(d, latest));
  const previous = peers.find((d) => d.date <= latest.date);
  if (previous && previous.amount > latest.amount) return { kind: "drop", label: `직전 거래보다 ${won(previous.amount - latest.amount)} 낮음` };
  if (isRecord(latest, deals)) return { kind: "record", label: "최고가 경신" };
  if (daysBetween(newestDate, latest.date) <= 7) return { kind: "new", label: "새 거래" };
  return undefined;
}

/** 좌표로 시군구 · 행정동을 붙인다. 경계 밖(바닷가 등)으로 살짝 벗어난 단지는 받아 온 시군구 코드를 쓴다. */
function toComplex(s: SnapshotComplex): Complex {
  const latest = s.deals.find((d) => !d.canceled)!;
  const { sgg, dong } = locate(s.sidoCode, s.lat, s.lng);
  return {
    id: s.id,
    name: s.name,
    sido: s.sido,
    sgg: s.sgg,
    umd: s.umd,
    sggCode: sgg?.code ?? s.sggCode,
    dongCode: dong?.code ?? null,
    dong: dong?.name ?? null,
    jibun: s.jibun,
    buildYear: s.buildYear,
    lat: s.lat,
    lng: s.lng,
    latest,
    dealCount: s.deals.filter((d) => !d.canceled).length,
    badge: badgeFor(latest, s.deals),
    station: nearestStation(s.lat, s.lng),
    schools: nearSchools(s.lat, s.lng),
    // 지번이 다른 건물을 가리켜 건축물대장 최고층이 실제 거래된 층보다 낮게 나오는 단지가 있다(7곳).
    // 그런 곳은 거래된 최고층을 최고층으로 쓴다 (내 집 내놓기에서 실제 층을 막지 않게)
    ...(buildings[s.id]
      ? { building: { ...buildings[s.id]!, maxFloor: Math.max(buildings[s.id]!.maxFloor, ...s.deals.map((d) => d.floor)) } }
      : {}),
  };
}

export const complexes: Complex[] = (snapshot?.complexes ?? []).map(toComplex);

const rawById = new Map((snapshot?.complexes ?? []).map((c) => [c.id, c]));
export const complexById = new Map(complexes.map((c) => [c.id, c]));
/** 단지의 거래 전부 (최근부터, 계약 해제 포함) */
export const dealsOf = (id: string): Deal[] => rawById.get(id)?.deals ?? [];
export const roadAddressOf = (id: string): string => rawById.get(id)?.roadAddress ?? "";
/** 같은 단지 · 같은 면적 거래들 사이에서 이 거래가 가장 높은 값인지 (비교 거래가 2건 이상일 때만) */
/**
 * 최고가 경신: 같은 단지 · 같은 면적에서 그보다 먼저 계약된 거래(계약 해제 제외)가 2건 이상 있고, 그 모두보다 높은 거래.
 * 자료가 최근 3개월치라 "역대 신고가"가 아니라 "자료 기간 안에서 앞선 거래를 넘어선 거래"다.
 * (뒤에 더 비싼 거래가 나와도 그 시점에 경신한 사실은 그대로 남는다)
 */
export function isRecord(deal: Deal, deals: Deal[]): boolean {
  if (deal.canceled) return false;
  const earlier = deals.filter((d) => !d.canceled && d.date < deal.date && sameArea(d, deal));
  return earlier.length >= 2 && earlier.every((d) => d.amount < deal.amount);
}

export const dataInfo: SearchResult["info"] = {
  source: snapshot?.source ?? "실거래가 스냅숏 없음",
  fetchedAt: snapshot?.fetchedAt ?? null,
  months: snapshot?.months ?? [],
  sggCount: snapshot?.sgg.filter((s) => s.deals > 0).length ?? 0, // 실거래가를 받아 온 시군구 수
};

const SORTERS: Record<SortKey, (a: Complex, b: Complex) => number> = {
  recent: (a, b) => b.latest.date.localeCompare(a.latest.date) || b.latest.amount - a.latest.amount,
  "price-desc": (a, b) => b.latest.amount - a.latest.amount,
  "price-asc": (a, b) => a.latest.amount - b.latest.amount,
  "area-desc": (a, b) => b.latest.areaM2 - a.latest.areaM2,
};

export const isSortKey = (s: string | null): s is SortKey => !!s && s in SORTERS;

export const PAGE_SIZE = 60;

/**
 * 주소의 지역 코드를 서로 맞춘다. 동만 와도 시군구 · 시도를 채우고, 서로 맞지 않는 아래 단계는 버린다.
 * 코드 앞자리가 위 단계 코드다 (동 10자리 앞 5자리 = 시군구, 시군구 앞 2자리 = 시도).
 */
export function normalizeFilter(raw: SearchFilter): { filter: SearchFilter; region: RegionPath } {
  const sidoCode = raw.sido ?? raw.sgg?.slice(0, 2) ?? raw.dong?.slice(0, 2) ?? null;
  const sido = sidoByCode(sidoCode);
  const sggCode = raw.sgg ?? raw.dong?.slice(0, 5) ?? null;
  const sgg = sido && sggCode?.startsWith(sido.code) ? sggAreas(sido.code).find((a) => a.code === sggCode) : undefined;
  const dong = sgg && raw.dong?.startsWith(sgg.code) ? dongAreas(sgg.code).find((a) => a.code === raw.dong) : undefined;
  const ref = (a?: { code: string; name: string }) => (a ? { code: a.code, name: a.name } : undefined);
  return {
    filter: { sido: sido?.code ?? null, sgg: sgg?.code ?? null, dong: dong?.code ?? null, q: raw.q.trim(), list: raw.list },
    region: { sido: sido && { code: sido.code, name: sido.short }, sgg: ref(sgg), dong: ref(dong) },
  };
}

function match(f: SearchFilter): Complex[] {
  const short = sidoByCode(f.sido)?.short;
  const words = f.q.split(/\s+/).filter(Boolean);
  return complexes.filter(
    (c) =>
      (!short || c.sido === short) &&
      (!f.sgg || c.sggCode === f.sgg) &&
      (!f.dong || c.dongCode === f.dong) &&
      (!f.list || matchesFilter(f.list, c, newestDate)) &&
      words.every((w) => `${c.name} ${c.sido} ${c.sgg} ${c.umd} ${c.dong ?? ""}`.includes(w)),
  );
}

/** GET /api/complexes. 지역과 검색어(단지명 · 시군구 · 동)로 거르고, 앞에서 limit 곳만 준다. */
export function searchComplexes(raw: SearchFilter, sort: SortKey, limit = PAGE_SIZE): SearchResult {
  const { filter, region } = normalizeFilter(raw);
  const matched = match(filter).sort(SORTERS[sort]);
  return { region, q: filter.q, total: matched.length, items: matched.slice(0, limit), info: dataInfo };
}

/** GET /api/complexes/points. 지도에 찍을 점 전부 (목록은 60곳씩 나눠 보여도 지도는 모두 보여 준다) */
/**
 * GET /api/stations: 조건에 맞는 단지 가운데 역세권인 단지가 기대는 역 (단지마다 가장 가까운 역).
 * 지도에 역을 다 찍으면 이웃 지역 역까지 빼곡해져서, 결과와 관계있는 역만 보여 준다.
 */
export function searchStations(raw: SearchFilter): StationsResult {
  const keys = new Set<string>();
  for (const c of match(normalizeFilter(raw).filter)) if (c.station && c.station.distanceM <= STATION_RADIUS_M) keys.add(stationKey(c.station));
  return { stations: stationPoints(keys) };
}

export function searchPoints(raw: SearchFilter): PointsResult {
  return { points: match(normalizeFilter(raw).filter).map((c) => [c.id, c.lat, c.lng, c.latest.amount]) };
}

/**
 * GET /api/complexes/summary?level=sido|sgg|dong. 조건(지역 · 검색어 · 검색 줄)에 맞는 단지를 한 단계 아래 지역별로 묶는다.
 * 지도에서 핀 대신 "치평동 18 · 4.2억" 같은 지역 묶음을 보여 줄 때 쓴다. 단지가 없는 지역은 빠진다.
 */
export function summarize(raw: SearchFilter, level: BubbleLevel): SummaryResult {
  const { filter } = normalizeFilter(raw);
  const groups = new Map<string, Complex[]>();
  for (const c of match(filter)) {
    const key = level === "sido" ? c.sggCode.slice(0, 2) : level === "sgg" ? c.sggCode : c.dongCode;
    if (!key) continue;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(c);
  }
  const nameOf = (code: string) =>
    level === "sido"
      ? sidoByCode(code)?.short
      : level === "sgg"
        ? sggAreas(code.slice(0, 2)).find((a) => a.code === code)?.name
        : dongAreas(code.slice(0, 5)).find((a) => a.code === code)?.name;
  const items = [...groups].flatMap(([code, list]) => {
    const name = nameOf(code);
    if (!name) return [];
    const prices = list.map((c) => c.latest.amount).sort((a, b) => a - b);
    const mid = prices.length >> 1;
    return [
      {
        code,
        name,
        count: list.length,
        median: prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2),
        lat: list.reduce((s, c) => s + c.lat, 0) / list.length,
        lng: list.reduce((s, c) => s + c.lng, 0) / list.length,
      },
    ];
  });
  return { level, items };
}

/** GET /api/regions. 시도를 주면 시군구 목록, 시군구를 주면 행정동 목록과 각 단지 수 */
export function childRegions(raw: SearchFilter): RegionsResult {
  // 회색(아직 받지 않은 지역)을 가리는 수이므로 검색 줄 조건은 빼고 센다
  const { filter, region } = normalizeFilter({ ...raw, dong: null, q: "", list: undefined });
  if (!filter.sido) return { parent: region, items: [] };
  const inParent = match(filter);
  const count = (key: (c: Complex) => string | null, code: string) => inParent.filter((c) => key(c) === code).length;
  const items = filter.sgg
    ? dongAreas(filter.sgg).map((a) => ({ code: a.code, name: a.name, count: count((c) => c.dongCode, a.code) }))
    : sggAreas(filter.sido).map((a) => ({ code: a.code, name: a.name, count: count((c) => c.sggCode, a.code) }));
  return { parent: region, items };
}
