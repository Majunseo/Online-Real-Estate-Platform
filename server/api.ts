import type { IncomingMessage, ServerResponse } from "http";
import { authRoutes } from "./auth/routes";
import { currentUser } from "./auth/session";
import { RECENT_MAX, recentViewIds } from "./db/member";
import { enabledIds, groundTruth } from "./bugs";
import { readFilter } from "../shared/filters";
import type { SearchFilter } from "../shared/types";
import { PAGE_SIZE, childRegions, complexById, dataInfo, isSortKey, searchComplexes, searchPoints, searchStations, summarize } from "./data/complexes";
import { homeData } from "./data/home";
import { json } from "./http";
import { findRoute, type Routes } from "./route";
import { marketRoutes } from "./routes/market";
import { memberRoutes } from "./routes/member";
import { resetStore } from "./store";


/** ?sido=&sgg=&dong=&q= 와 검색 줄 조건(priceMin 등) → 검색 조건 */
const filterFrom = (url: URL): SearchFilter => ({
  sido: url.searchParams.get("sido"),
  sgg: url.searchParams.get("sgg"),
  dong: url.searchParams.get("dong"),
  q: url.searchParams.get("q") ?? "",
  list: readFilter(url.searchParams),
});

/** "메서드 경로" → 처리기. 기능을 빼거나 붙일 때 이 표만 고친다. */
const routes: Routes = {
  "GET /api/health": (_req, res) => json(res, 200, { status: "ok" }),
  /** 자료 출처 · 받아 온 시각 · 기간 · 시군구 수 (바닥글 "자료 기준" 줄) */
  "GET /api/data-info": (_req, res) => json(res, 200, dataInfo),
  "GET /api/bugs": (_req, res) => json(res, 200, { enabled: enabledIds() }),
  "GET /gt.json": (_req, res) => json(res, 200, groundTruth()),
  "POST /_reset": (_req, res) => {
    resetStore();
    return json(res, 200, { reset: true });
  },
  // 최근 본 단지: 로그인했으면 계정에 쌓인 것, 아니면 ?recent=id,id,… (브라우저에만 저장해 두고 요청할 때만 보낸다)
  // ?lat=&lng= : 이용자가 허용한 현재 위치 (화면이 약 1km 단위로 줄여 보낸다). 계산에만 쓰고 남기지 않는다
  "GET /api/home": (req, res, url) => {
    const user = currentUser(req);
    const recent = user ? recentViewIds(user.id) : (url.searchParams.get("recent") ?? "").split(",").filter(Boolean).slice(0, RECENT_MAX);
    const lat = Number(url.searchParams.get("lat"));
    const lng = Number(url.searchParams.get("lng"));
    const at = url.searchParams.has("lat") && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    return json(res, 200, homeData(recent, at));
  },
  /** 최근 본 단지 목록 (최근 것이 앞). 로그인했으면 계정 기록, 아니면 ?ids=id,id,… 로 넘긴 브라우저 기록. 없는 단지는 뺀다 */
  "GET /api/recent-views": (req, res, url) => {
    const user = currentUser(req);
    const ids = user ? recentViewIds(user.id) : (url.searchParams.get("ids") ?? "").split(",").filter(Boolean).slice(0, RECENT_MAX);
    return json(res, 200, { items: ids.map((id) => complexById.get(id)).filter(Boolean) });
  },
  "GET /api/complexes": (_req, res, url) => {
    const sort = url.searchParams.get("sort");
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || PAGE_SIZE, 1), 1000);
    return json(res, 200, searchComplexes(filterFrom(url), isSortKey(sort) ? sort : "recent", limit));
  },
  "GET /api/complexes/points": (_req, res, url) => json(res, 200, searchPoints(filterFrom(url))),
  "GET /api/complexes/summary": (_req, res, url) => {
    const level = url.searchParams.get("level");
    return json(res, 200, summarize(filterFrom(url), level === "sgg" || level === "dong" ? level : "sido"));
  },
  "GET /api/regions": (_req, res, url) => json(res, 200, childRegions(filterFrom(url))),
  "GET /api/stations": (_req, res, url) => json(res, 200, searchStations(filterFrom(url))),
  ...authRoutes,
  ...marketRoutes,
  ...memberRoutes,
};

/** 처리했으면 true. /api 밖의 주소는 화면(Vite)에 넘긴다. */
export async function handleApi(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;
  if (!path.startsWith("/api/") && path !== "/gt.json" && path !== "/_reset") return false;
  const found = findRoute(routes, req.method ?? "GET", path);
  if (found) return found.handler(req, res, url, found.params);
  return json(res, 404, { error: "not_found", message: "없는 API 예요." });
}
