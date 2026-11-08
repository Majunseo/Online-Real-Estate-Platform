import type { DealFilter, DealPeriod, DealSort, SearchFilter } from "../../shared/types";
import { listAgents } from "../data/agents";
import { budgetPicks, complexDetail, listDeals } from "../data/market";
import { suggest } from "../data/suggest";
import { fail, json } from "../http";
import type { Routes } from "../route";

/** 실거래가 스냅숏으로 답하는 읽기 전용 API (로그인 필요 없음) */

const filterFrom = (url: URL): SearchFilter => ({
  sido: url.searchParams.get("sido"),
  sgg: url.searchParams.get("sgg"),
  dong: null,
  q: url.searchParams.get("q") ?? "",
});

const pick = <T extends string>(value: string | null, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? (value as T) : fallback);

/** 전용면적 범위 (㎡, 양의 정수만). 잘못된 값은 제한 없음으로 */
const areaFrom = (url: URL) => {
  const n = (k: string) => {
    const v = Number(url.searchParams.get(k));
    return Number.isInteger(v) && v > 0 ? v : null;
  };
  return { areaMin: n("areaMin"), areaMax: n("areaMax") };
};

export const marketRoutes: Routes = {
  "GET /api/complexes/:id": (_req, res, _url, { id }) => {
    const detail = complexDetail(id);
    return detail ? json(res, 200, detail) : fail(res, 404, { error: "not_found", message: "없는 단지예요." });
  },

  "GET /api/deals": (_req, res, url) =>
    json(
      res,
      200,
      listDeals(
        filterFrom(url),
        areaFrom(url),
        pick<DealFilter>(url.searchParams.get("filter"), ["all", "record", "canceled"], "all"),
        pick<DealPeriod>(url.searchParams.get("period"), ["all", "month"], "all"),
        pick<DealSort>(url.searchParams.get("sort"), ["recent", "price-desc"], "recent"),
        Number(url.searchParams.get("page")) || 1,
      ),
    ),

  "GET /api/agents": (_req, res, url) => json(res, 200, listAgents(filterFrom(url))),

  /** 검색어 자동완성: 지역 · 단지 후보 */
  "GET /api/suggest": (_req, res, url) => json(res, 200, { items: suggest(url.searchParams.get("q") ?? "") }),

  /** 예산 안 단지 (로그인 없이도: 화면이 계산한 목표 · 최대 매매가와 관심 지역을 넘긴다) */
  "GET /api/budget-picks": (_req, res, url) => {
    const target = Number(url.searchParams.get("target"));
    const max = Number(url.searchParams.get("max"));
    if (!(target > 0) || !(max >= target)) return fail(res, 400, { error: "invalid_input", message: "목표 · 최대 매매가가 필요해요." });
    return json(res, 200, budgetPicks(target, max, url.searchParams.get("sido"), url.searchParams.get("sgg")));
  },
};
