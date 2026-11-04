import type { Complex, HomeData } from "../../shared/types";
import { complexById, complexes, dealsOf, newestDate } from "./complexes";

/**
 * 첫 화면 묶음. 실거래가 스냅숏에서 규칙으로 고른다 (단지 자료는 complexes.ts).
 *   추천 단지(위): 이용자가 허용한 현재 위치 근처 단지. 위치가 없으면 요즘 거래가 많은 단지
 *   지역 단지(아래): 최근 본 단지가 있는 시군구. 본 적이 없으면 거래가 가장 많은 시군구
 * 위치는 요청을 계산하는 데만 쓰고 어디에도 남기지 않는다.
 */
const recentFirst = (a: Complex, b: Complex) => b.latest.date.localeCompare(a.latest.date) || b.latest.amount - a.latest.amount;
const inSeoul = complexes.filter((c) => c.sido === "서울");
const regionName = (c: Complex) => `${c.sido} ${c.sgg}`;
const NEAR_KM = 5;

/** 요즘 거래가 많은 단지: 자료의 마지막 계약일부터 30일 안의 거래 건수 순 */
const popular = (() => {
  const since = new Date(Date.parse(newestDate) - 30 * 86_400_000).toISOString().slice(0, 10);
  const recentDeals = new Map(complexes.map((c) => [c.id, dealsOf(c.id).filter((d) => !d.canceled && d.date >= since).length]));
  return [...complexes].sort((a, b) => recentDeals.get(b.id)! - recentDeals.get(a.id)! || recentFirst(a, b)).slice(0, 10);
})();

/** 거래가 가장 많은 시군구: 최근 본 단지가 없을 때 지역 추천에 쓴다 */
const busiestSgg = (() => {
  const counts = new Map<string, number>();
  for (const c of complexes) counts.set(c.sggCode, (counts.get(c.sggCode) ?? 0) + c.dealCount);
  const [code] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [""];
  return complexes.find((c) => c.sggCode === code);
})();

function distKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function recommended(at: { lat: number; lng: number } | null): HomeData["recommended"] {
  const popularPick = (reason: string): HomeData["recommended"] => ({ basis: "popular", items: popular, reason });
  if (!at) return popularPick("요즘 거래가 많은 단지예요 (최근 30일 거래 건수 순)");
  const near = complexes
    .map((c) => ({ c, km: distKm(at.lat, at.lng, c.lat, c.lng) }))
    .filter((x) => x.km <= NEAR_KM)
    .sort((a, b) => a.km - b.km)
    .slice(0, 10);
  if (!near.length) return popularPick(`내 위치 ${NEAR_KM}km 안에는 아직 자료가 있는 단지가 없어 요즘 거래가 많은 단지를 보여 드려요`);
  return { basis: "location", items: near.map((x) => x.c), reason: `내 위치에서 가까운 단지예요 (${regionName(near[0].c)} 근처 · 가까운 순)` };
}

function regional(seen: Complex[]): HomeData["regional"] {
  const base = seen[0] ?? busiestSgg;
  if (!base) return { region: "", sggCode: "", items: [], reason: "아직 보여 드릴 단지가 없어요" };
  const seenIds = new Set(seen.map((c) => c.id));
  return {
    region: regionName(base),
    sggCode: base.sggCode,
    items: complexes.filter((c) => c.sggCode === base.sggCode && !seenIds.has(c.id)).sort(recentFirst).slice(0, 10),
    reason: seen[0] ? `최근 본 '${base.name}' 주변(${base.sgg}) 단지예요` : "최근 3개월 거래가 가장 많은 지역이에요",
  };
}

/** recentIds: 최근 본 단지 (최신이 앞). at: 이용자가 허용한 현재 위치 (없으면 null) */
export function homeData(recentIds: string[], at: { lat: number; lng: number } | null): HomeData {
  const seen = recentIds.map((id) => complexById.get(id)).filter((c): c is Complex => !!c);
  return {
    recommended: recommended(at),
    // 서울 전용 59㎡ 이상 중 가장 싼 곳 (예산을 넣기 전 자리 채움)
    budget: inSeoul
      .filter((c) => c.latest.areaM2 >= 59)
      .sort((a, b) => a.latest.amount - b.latest.amount)
      .slice(0, 4)
      .map((c) => ({ ...c, badge: { kind: "budget", label: "예산 안" } })),
    regional: regional(seen),
  };
}
