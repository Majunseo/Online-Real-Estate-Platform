import type { ComplexDetail, DealFilter, DealPeriod, DealRow, DealSort, DealsResult, SearchFilter, UpdateItem } from "../../shared/types";
import { complexById, complexes, dealsOf, isRecord, newestDate, normalizeFilter, roadAddressOf } from "./complexes";

/** 실거래가 스냅숏으로 만드는 화면 자료: 단지 상세 · 실거래가 목록 · 새 소식 */

const DAY = 86_400_000;
const withinDays = (date: string, days: number) => Date.parse(newestDate) - Date.parse(date) <= days * DAY;

/** GET /api/complexes/:id */
export function complexDetail(id: string): ComplexDetail | null {
  const complex = complexById.get(id);
  if (!complex) return null;
  const deals = dealsOf(id);
  return {
    complex,
    roadAddress: roadAddressOf(id),
    deals,
    areas: [...new Set(deals.map((d) => Math.round(d.areaM2)))].sort((a, b) => a - b),
    nearby: complexes
      .filter((c) => c.sggCode === complex.sggCode && c.id !== id)
      .sort((a, b) => b.latest.date.localeCompare(a.latest.date))
      .slice(0, 6),
  };
}

export const DEALS_PAGE_SIZE = 50;

/** 모든 거래를 한 줄씩 (최근 계약부터). 켜질 때 한 번 만든다 */
const allRows: (DealRow & { sggCode: string })[] = complexes
  .flatMap((c) => {
    const deals = dealsOf(c.id);
    return deals.map((deal) => ({ complexId: c.id, complexName: c.name, sido: c.sido, sgg: c.sgg, umd: c.umd, deal, record: isRecord(deal, deals), sggCode: c.sggCode }));
  })
  .sort((a, b) => b.deal.date.localeCompare(a.deal.date) || b.deal.amount - a.deal.amount);

/** 가격 높은 순: 계약 해제된 거래는 실제로 거래된 값이 아니므로 맨 뒤로 보낸다 */
const byPrice = (a: DealRow, b: DealRow) => Number(a.deal.canceled) - Number(b.deal.canceled) || b.deal.amount - a.deal.amount || b.deal.date.localeCompare(a.deal.date);

/** GET /api/deals?sido=&sgg=&filter=record|canceled&period=month&sort=recent|price-desc&page= */
export function listDeals(raw: SearchFilter, filter: DealFilter, period: DealPeriod, sort: DealSort, page: number): DealsResult {
  const { filter: f, region } = normalizeFilter({ ...raw, dong: null, q: "" });
  const short = region.sido?.name;
  const rows = allRows.filter(
    (r) =>
      (!short || r.sido === short) &&
      (!f.sgg || r.sggCode === f.sgg) &&
      (period === "all" || withinDays(r.deal.date, 30)) &&
      (filter === "all" || (filter === "record" ? r.record : r.deal.canceled)),
  );
  if (sort === "price-desc") rows.sort(byPrice); // allRows 는 이미 최근 계약순
  const pages = Math.max(1, Math.ceil(rows.length / DEALS_PAGE_SIZE));
  const p = Math.min(Math.max(1, page), pages);
  return {
    region,
    filter,
    period,
    sort,
    newestDate,
    total: rows.length,
    page: p,
    pageSize: DEALS_PAGE_SIZE,
    items: rows.slice((p - 1) * DEALS_PAGE_SIZE, p * DEALS_PAGE_SIZE).map(({ sggCode: _, ...row }) => row),
  };
}

/**
 * GET /api/updates. 로그인했으면 관심 단지의 최근 30일 거래, 아니면(또는 관심 단지가 없으면)
 * 전국에서 최근 일주일 사이 가격이 내려간 거래와 최고가를 경신한 거래.
 */
export function updatesFor(favoriteIds: string[]): { personal: UpdateItem[]; market: UpdateItem[] } {
  const personal: UpdateItem[] = favoriteIds.flatMap((id) => {
    const complex = complexById.get(id);
    if (!complex) return [];
    return dealsOf(id)
      .filter((d) => withinDays(d.date, 30))
      .map((deal) => ({
        kind: "favorite-deal" as const,
        complex,
        deal,
        text: deal.canceled ? "관심 단지의 거래가 계약 해제됐어요" : "관심 단지에 새 실거래가 신고됐어요",
      }));
  });
  personal.sort((a, b) => b.deal.date.localeCompare(a.deal.date));

  const market: UpdateItem[] = complexes
    .filter((c) => (c.badge?.kind === "drop" || c.badge?.kind === "record") && withinDays(c.latest.date, 7))
    .sort((a, b) => b.latest.date.localeCompare(a.latest.date))
    .slice(0, 20)
    .map((c) => ({
      kind: c.badge!.kind as "drop" | "record",
      complex: c,
      deal: c.latest,
      text: c.badge!.label,
    }));
  return { personal: personal.slice(0, 50), market };
}

/**
 * GET /api/budget-picks. 예산 안 단지: 관심 지역에서 최근 실거래가가 최대 매매가 이하이고 목표의 60% 이상인 곳을
 * 목표 매매가에 가까운 순으로. 시군구에 없으면 같은 시도로 넓힌다.
 */
export function budgetPicks(target: number, max: number, sido: string | null, sgg: string | null) {
  const { filter, region } = normalizeFilter({ sido, sgg, dong: null, q: "" });
  const short = region.sido?.name;
  const pick = (useSgg: boolean) =>
    complexes
      .filter((c) => (!short || c.sido === short) && (!useSgg || !filter.sgg || c.sggCode === filter.sgg))
      .filter((c) => c.latest.amount <= max && c.latest.amount >= target * 0.6)
      .sort((a, b) => Math.abs(a.latest.amount - target) - Math.abs(b.latest.amount - target) || b.latest.date.localeCompare(a.latest.date))
      .slice(0, 10)
      .map((c) => ({ ...c, badge: { kind: "budget" as const, label: c.latest.amount <= target ? "목표 안" : "최대 안" } }));
  let items = pick(true);
  let widened = false;
  if (!items.length && filter.sgg) {
    items = pick(false);
    widened = true;
  }
  return { region, widened, items };
}
