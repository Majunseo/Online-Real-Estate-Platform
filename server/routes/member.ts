import { validateInquiry, validateListing, type InquiryInput, type ListingInput } from "../../shared/forms";
import { PLAN_STEPS } from "../../shared/plan";
import type { Listing, PlanStep } from "../../shared/types";
import { currentUser } from "../auth/session";
import { complexById, complexes } from "../data/complexes";
import { updatesFor } from "../data/market";
import {
  addFavorite,
  addInquiry,
  addListing,
  deleteMessage,
  favoriteIds,
  listingsOf,
  messagesOf,
  planOf,
  readMessage,
  removeFavorite,
  removeListing,
  savePlanStep,
  sendMessage,
  unreadCount,
  budgetOf,
  deleteSavedSearch,
  saveBudget,
  saveSearch,
  savedSearchesOf,
  findInquiry,
  inquiriesOf,
  ticketOf,
  clearRecentViews,
  rememberRecentView,
} from "../db/member";
import { computeBudget, validateBudget, type BudgetInput } from "../../shared/budget";
import { fail, json, readJson, str } from "../http";
import { requireUser, type Routes } from "../route";

/** 회원별 자료 API. 새 소식 · 문의를 빼면 모두 로그인이 필요하다 */

const needJson = (res: Parameters<typeof fail>[0]) => fail(res, 415, { error: "unsupported_media_type", message: "JSON 으로 보내 주세요." });
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN);

function withComplex(l: Omit<Listing, "complexName" | "address">): Listing {
  const c = complexById.get(l.complexId);
  return { ...l, complexName: c?.name ?? "(없어진 단지)", address: c ? `${c.sido} ${c.sgg} ${c.umd} ${c.jibun}` : "" };
}

function planFor(userId: number): PlanStep[] {
  const saved = planOf(userId);
  return PLAN_STEPS.map((s) => {
    const row = saved.get(s.id);
    return { ...s, done: row?.done ?? false, memo: row?.memo ?? "", updatedAt: row?.updatedAt ?? null };
  });
}

export const memberRoutes: Routes = {
  // ── 관심 단지 ──
  "GET /api/favorites": (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    const ids = favoriteIds(user.id);
    return json(res, 200, { ids, items: ids.map((id) => complexById.get(id)).filter(Boolean) });
  },
  "PUT /api/favorites/:id": (req, res, _url, { id }) => {
    const user = requireUser(req, res);
    if (!user) return true;
    if (!complexById.has(id)) return fail(res, 404, { error: "not_found", message: "없는 단지예요." });
    addFavorite(user.id, id);
    return json(res, 200, { ids: favoriteIds(user.id) });
  },
  "DELETE /api/favorites/:id": (req, res, _url, { id }) => {
    const user = requireUser(req, res);
    if (!user) return true;
    removeFavorite(user.id, id);
    return json(res, 200, { ids: favoriteIds(user.id) });
  },

  // ── 새 소식 (로그인 안 해도 전국 소식은 보인다) ──
  "GET /api/updates": (req, res) => {
    const user = currentUser(req);
    return json(res, 200, { signedIn: Boolean(user), ...updatesFor(user ? favoriteIds(user.id) : []) });
  },

  // ── 내 집 내놓기 ──
  "GET /api/listings": (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    return json(res, 200, { items: listingsOf(user.id).map(withComplex) });
  },
  "POST /api/listings": async (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    const b = await readJson(req);
    if (!b) return needJson(res);
    const input: ListingInput = {
      complexId: str(b.complexId),
      building: str(b.building),
      unit: str(b.unit),
      areaM2: num(b.areaM2),
      floor: num(b.floor),
      price: num(b.price),
      contact: str(b.contact),
      description: str(b.description),
    };
    const errors = validateListing(input, complexById.get(input.complexId)?.building?.maxFloor);
    if (input.complexId && !complexById.has(input.complexId)) errors.complexId = "없는 단지예요. 목록에서 골라 주세요.";
    const [field, message] = Object.entries(errors)[0] ?? [];
    if (field) return json(res, 400, { error: "invalid_input", field, message, errors });
    const id = addListing(user.id, input);
    const c = complexById.get(input.complexId)!;
    sendMessage(user.id, "집터 고객센터", `${c.name} 매물이 등록됐어요`, `${input.building}동 ${input.unit}호 · 희망가 ${input.price.toLocaleString("ko-KR")}만 원\n등록한 매물은 나만 볼 수 있어요. 내 집 내놓기 화면에서 확인하고 지울 수 있어요.`);
    return json(res, 201, { item: withComplex(listingsOf(user.id).find((l) => l.id === id)!) });
  },
  "DELETE /api/listings/:id": (req, res, _url, { id }) => {
    const user = requireUser(req, res);
    if (!user) return true;
    return removeListing(user.id, Number(id)) ? json(res, 200, { ok: true }) : fail(res, 404, { error: "not_found", message: "없는 매물이에요." });
  },
  /** 매물 등록에서 단지 고르기: 이름 · 동네로 찾는다 */
  "GET /api/complex-search": (_req, res, url) => {
    const words = (url.searchParams.get("q") ?? "").trim().split(/\s+/).filter(Boolean);
    const items = words.length
      ? complexes.filter((c) => words.every((w) => `${c.name} ${c.sido} ${c.sgg} ${c.umd}`.includes(w))).slice(0, 8)
      : [];
    return json(res, 200, { items: items.map((c) => ({ id: c.id, name: c.name, address: `${c.sido} ${c.sgg} ${c.umd} ${c.jibun}` })) });
  },

  // ── 내 계획 ──
  "GET /api/plan": (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    return json(res, 200, { steps: planFor(user.id) });
  },
  "PUT /api/plan/:step": async (req, res, _url, { step }) => {
    const user = requireUser(req, res);
    if (!user) return true;
    if (!PLAN_STEPS.some((s) => s.id === step)) return fail(res, 404, { error: "not_found", message: "없는 단계예요." });
    const b = await readJson(req);
    if (!b) return needJson(res);
    const memo = str(b.memo).trim();
    if (memo.length > 200) return fail(res, 400, { error: "invalid_input", message: "메모는 200자까지 쓸 수 있어요." });
    savePlanStep(user.id, step, b.done === true, memo);
    return json(res, 200, { steps: planFor(user.id) });
  },

  // ── 메시지 ──
  "GET /api/inbox": (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    return json(res, 200, { items: messagesOf(user.id), unread: unreadCount(user.id) });
  },
  /** 열면 읽음으로 바꾼다 */
  "GET /api/inbox/:id": (req, res, _url, { id }) => {
    const user = requireUser(req, res);
    if (!user) return true;
    const message = readMessage(user.id, Number(id));
    return message ? json(res, 200, { message, unread: unreadCount(user.id) }) : fail(res, 404, { error: "not_found", message: "없는 메시지예요." });
  },
  "DELETE /api/inbox/:id": (req, res, _url, { id }) => {
    const user = requireUser(req, res);
    if (!user) return true;
    return deleteMessage(user.id, Number(id)) ? json(res, 200, { unread: unreadCount(user.id) }) : fail(res, 404, { error: "not_found", message: "없는 메시지예요." });
  },
  "GET /api/inbox-count": (req, res) => {
    const user = currentUser(req);
    return json(res, 200, { unread: user ? unreadCount(user.id) : 0 });
  },

  // ── 최근 본 단지 (로그인한 회원. 로그인 전에는 화면이 브라우저에만 둔다) ──
  "POST /api/recent-views": async (req, res) => {
    const b = await readJson(req);
    if (!b) return needJson(res);
    const user = requireUser(req, res);
    if (!user) return true;
    const id = str(b.complexId);
    if (!complexById.has(id)) return fail(res, 404, { error: "not_found", message: "없는 단지예요." });
    rememberRecentView(user.id, id);
    return json(res, 200, { ok: true });
  },

  "DELETE /api/recent-views": (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    clearRecentViews(user.id);
    return json(res, 200, { ok: true });
  },

  // ── 검색 저장 ──
  "GET /api/saved-searches": (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    return json(res, 200, { items: savedSearchesOf(user.id) });
  },
  "POST /api/saved-searches": async (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    const b = await readJson(req);
    if (!b) return needJson(res);
    const name = str(b.name).trim().slice(0, 80);
    const query = str(b.query).trim().replace(/^\?/, "");
    if (!name || query.length > 500) return fail(res, 400, { error: "invalid_input", message: "저장할 검색이 올바르지 않아요." });
    saveSearch(user.id, name, query);
    return json(res, 201, { items: savedSearchesOf(user.id) });
  },
  "DELETE /api/saved-searches/:id": (req, res, _url, { id }) => {
    const user = requireUser(req, res);
    if (!user) return true;
    return deleteSavedSearch(user.id, Number(id)) ? json(res, 200, { items: savedSearchesOf(user.id) }) : fail(res, 404, { error: "not_found", message: "없는 검색이에요." });
  },

  // ── 내 예산 (로그인한 회원만 서버에 저장. 로그인 전에는 화면이 브라우저에만 둔다) ──
  "GET /api/budget": (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    const input = budgetOf(user.id);
    return json(res, 200, { input, result: input ? computeBudget(input) : null });
  },
  "PUT /api/budget": async (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    const b = await readJson(req);
    if (!b) return needJson(res);
    const input: BudgetInput = {
      sido: str(b.sido),
      sgg: str(b.sgg) || null,
      income: num(b.income),
      cash: num(b.cash),
      monthlyDebt: num(b.monthlyDebt),
      rate: num(b.rate),
      years: num(b.years),
    };
    const errors = validateBudget(input);
    const [field, message] = Object.entries(errors)[0] ?? [];
    if (field) return json(res, 400, { error: "invalid_input", field, message, errors });
    saveBudget(user.id, input);
    return json(res, 200, { input, result: computeBudget(input) });
  },

  // ── 내 문의 조회 ──
  /** 로그인한 회원이 남긴 문의 전부 */
  "GET /api/inquiries": (req, res) => {
    const user = requireUser(req, res);
    if (!user) return true;
    return json(res, 200, { items: inquiriesOf(user.id) });
  },
  /** 로그인 없이: 접수번호 + 이메일이 맞으면 그 문의 하나 */
  "GET /api/inquiries/lookup": (_req, res, url) => {
    const found = findInquiry(url.searchParams.get("ticket") ?? "", url.searchParams.get("email") ?? "");
    return found ? json(res, 200, { item: found }) : fail(res, 404, { error: "not_found", message: "접수번호와 이메일이 맞는 문의가 없어요." });
  },

  // ── 문의: 고객센터(로그인 필요) · 광고(누구나) ──
  "POST /api/inquiries": async (req, res) => {
    const b = await readJson(req);
    if (!b) return needJson(res);
    const kind = b.kind === "advertise" ? "advertise" : "help";
    const user = kind === "help" ? requireUser(req, res) : currentUser(req);
    if (kind === "help" && !user) return true;
    const input: InquiryInput = {
      kind,
      name: str(b.name),
      email: str(b.email),
      phone: str(b.phone),
      company: str(b.company),
      category: str(b.category),
      subject: str(b.subject),
      body: str(b.body),
    };
    const errors = validateInquiry(input);
    const [field, message] = Object.entries(errors)[0] ?? [];
    if (field) return json(res, 400, { error: "invalid_input", field, message, errors });
    const id = addInquiry(user?.id ?? null, input);
    const ticket = ticketOf(kind, id);
    if (user && kind === "help") {
      sendMessage(user.id, "집터 고객센터", `[${ticket}] 문의가 접수됐어요`, `"${input.subject.trim()}" 문의를 받았어요. 영업일 기준 2일 안에 이 메시지함으로 답변드릴게요.`);
    }
    return json(res, 201, { ticket });
  },
};
