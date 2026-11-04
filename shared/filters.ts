/**
 * 검색 줄 조건(매매 기간 · 가격 · 면적 · 준공 연도 · 필터). 주소의 ?키=값 과 서로 바꾼다.
 * 화면은 주소를 만들고, 서버는 같은 주소를 읽어 단지를 거른다. 조건을 더할 때 이 파일만 고친다.
 * 모든 조건은 단지의 "최근 실거래"(계약 해제 제외)를 기준으로 본다.
 */
export type Period = "all" | "month" | "week";
export type Dealing = "all" | "중개거래" | "직거래";
export type BadgeFilter = "drop" | "record" | "new" | null;

/** 역세권: 단지에서 지하철역 중심까지 직선 거리가 이 안이면 역세권으로 본다 */
export const STATION_RADIUS_M = 500;

/** 학교 근처: 고를 수 있는 거리와 기본값 (m, 직선 거리) */
export const SCHOOL_DISTANCES = [300, 500, 1000] as const;
export const SCHOOL_DIST_DEFAULT = 500;
const SCHOOL_LEVELS = ["e", "m", "h"] as const;
export type SchoolLevelKey = (typeof SCHOOL_LEVELS)[number];

/** ?school=e,m → ["e", "m"] (모르는 값은 버리고 초 · 중 · 고 순서로) */
export const schoolLevelsOf = (f: Pick<ListFilter, "school">): SchoolLevelKey[] => SCHOOL_LEVELS.filter((l) => f.school?.split(",").includes(l));

export interface ListFilter {
  period: Period;
  priceMin: number | null; // 만원
  priceMax: number | null;
  areaMin: number | null; // 전용 ㎡
  areaMax: number | null;
  builtMin: number | null; // 준공 연도
  builtMax: number | null;
  dealing: Dealing;
  badge: BadgeFilter;
  /** 세대수 이상 (건축물대장). 걸면 세대수를 모르는 단지는 빠진다 */
  householdsMin: number | null;
  /** "station" = 역세권만 (주소 ?near=station) */
  near: "station" | null;
  /** 학교 근처: 학교급 "e,m,h" 중 고른 것 (하나라도 schoolDist 안에 있으면 맞다). 없으면 학교 조건 없음 */
  school: string | null;
  /** 학교 설립: 국공립 · 사립만 (없으면 둘 다). school 이 있을 때만 쓴다 */
  schoolOwner: "public" | "private" | null;
  /** 학교까지 거리 (m). 없으면 SCHOOL_DIST_DEFAULT. school 이 있을 때만 쓴다 */
  schoolDist: number | null;
}

export const EMPTY_FILTER: ListFilter = { period: "all", priceMin: null, priceMax: null, areaMin: null, areaMax: null, builtMin: null, builtMax: null, dealing: "all", badge: null, householdsMin: null, near: null, school: null, schoolOwner: null, schoolDist: null };

const KEYS = ["period", "priceMin", "priceMax", "areaMin", "areaMax", "builtMin", "builtMax", "dealing", "badge", "householdsMin", "near", "school", "schoolOwner", "schoolDist"] as const;
export const FILTER_KEYS: readonly string[] = KEYS;

const num = (v: string | null) => (v !== null && v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null);

export function readFilter(p: URLSearchParams): ListFilter {
  const period = p.get("period");
  const dealing = p.get("dealing");
  const badge = p.get("badge");
  return {
    period: period === "month" || period === "week" ? period : "all",
    priceMin: num(p.get("priceMin")),
    priceMax: num(p.get("priceMax")),
    areaMin: num(p.get("areaMin")),
    areaMax: num(p.get("areaMax")),
    builtMin: num(p.get("builtMin")),
    builtMax: num(p.get("builtMax")),
    dealing: dealing === "중개거래" || dealing === "직거래" ? dealing : "all",
    badge: badge === "drop" || badge === "record" || badge === "new" ? badge : null,
    householdsMin: num(p.get("householdsMin")),
    near: p.get("near") === "station" ? "station" : null,
    ...readSchool(p),
  };
}

function readSchool(p: URLSearchParams): Pick<ListFilter, "school" | "schoolOwner" | "schoolDist"> {
  const levels = schoolLevelsOf({ school: p.get("school") });
  if (!levels.length) return { school: null, schoolOwner: null, schoolDist: null };
  const owner = p.get("schoolOwner");
  const dist = Number(p.get("schoolDist"));
  return {
    school: levels.join(","),
    schoolOwner: owner === "public" || owner === "private" ? owner : null,
    schoolDist: (SCHOOL_DISTANCES as readonly number[]).includes(dist) && dist !== SCHOOL_DIST_DEFAULT ? dist : null,
  };
}

/** 기본값이 아닌 조건만 p 에 쓴다 (주소를 짧게) */
export function writeFilter(p: URLSearchParams, f: ListFilter): URLSearchParams {
  for (const k of KEYS) p.delete(k);
  for (const k of KEYS) {
    const v = f[k];
    if (v === null || v === "all") continue;
    p.set(k, String(v));
  }
  return p;
}

export const activeCount = (f: ListFilter) => KEYS.filter((k) => f[k] !== null && f[k] !== "all").length;

/** 단지 하나가 조건에 맞는지. latest 는 최근 실거래, newestDate 는 자료 전체의 가장 최근 계약일 */
export function matchesFilter(
  f: ListFilter,
  c: { buildYear: number; latest: { amount: number; areaM2: number; date: string; dealingType: string }; badge?: { kind: string }; building?: { households: number }; station?: { distanceM: number }; schools?: { level: string; owner: string; distanceM: number }[] },
  newestDate: string,
): boolean {
  const days = f.period === "week" ? 7 : f.period === "month" ? 30 : null;
  if (days !== null && (Date.parse(newestDate) - Date.parse(c.latest.date)) / 86_400_000 > days) return false;
  if (f.priceMin !== null && c.latest.amount < f.priceMin) return false;
  if (f.priceMax !== null && c.latest.amount > f.priceMax) return false;
  if (f.areaMin !== null && c.latest.areaM2 < f.areaMin) return false;
  if (f.areaMax !== null && c.latest.areaM2 > f.areaMax) return false;
  if (f.builtMin !== null && c.buildYear < f.builtMin) return false;
  if (f.builtMax !== null && c.buildYear > f.builtMax) return false;
  if (f.dealing !== "all" && c.latest.dealingType !== f.dealing) return false;
  if (f.badge !== null && c.badge?.kind !== f.badge) return false;
  if (f.householdsMin !== null && (c.building?.households ?? 0) < f.householdsMin) return false;
  if (f.near === "station" && !(c.station && c.station.distanceM <= STATION_RADIUS_M)) return false;
  if (f.school) {
    const levels: string[] = schoolLevelsOf(f);
    const dist = f.schoolDist ?? SCHOOL_DIST_DEFAULT;
    if (!c.schools?.some((s) => levels.includes(s.level) && (!f.schoolOwner || s.owner === f.schoolOwner) && s.distanceM <= dist)) return false;
  }
  return true;
}
