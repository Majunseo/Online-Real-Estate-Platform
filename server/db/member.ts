import type { Listing, Message } from "../../shared/types";
import type { BudgetInput } from "../../shared/budget";
import type { InquiryInput, ListingInput } from "../../shared/forms";
import { db, transaction } from "./index";

/** 회원별 자료(관심 단지 · 매물 · 계획 · 메시지 · 문의) 읽기 · 쓰기. SQL 은 server/db 안에만 둔다 */

const now = () => new Date().toISOString();

// ── 관심 단지 ───────────────────────────────────────────────────

export function favoriteIds(userId: number): string[] {
  return (db.prepare("SELECT complex_id FROM favorites WHERE user_id = ? ORDER BY created_at DESC").all(userId) as { complex_id: string }[]).map(
    (r) => r.complex_id,
  );
}

export function addFavorite(userId: number, complexId: string): void {
  db.prepare("INSERT OR IGNORE INTO favorites (user_id, complex_id, created_at) VALUES (?, ?, ?)").run(userId, complexId, now());
}

export function removeFavorite(userId: number, complexId: string): void {
  db.prepare("DELETE FROM favorites WHERE user_id = ? AND complex_id = ?").run(userId, complexId);
}

// ── 내 집 내놓기 ────────────────────────────────────────────────

interface ListingRow {
  id: number;
  complex_id: string;
  building: string;
  unit: string;
  area_m2: number;
  floor: number;
  price: number;
  contact: string;
  description: string;
  created_at: string;
}

export function listingsOf(userId: number): Omit<Listing, "complexName" | "address">[] {
  const rows = db.prepare("SELECT * FROM listings WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(userId) as unknown as ListingRow[];
  return rows.map((r) => ({
    id: r.id,
    complexId: r.complex_id,
    building: r.building,
    unit: r.unit,
    areaM2: r.area_m2,
    floor: r.floor,
    price: r.price,
    contact: r.contact,
    description: r.description,
    createdAt: r.created_at,
  }));
}

export function addListing(userId: number, v: ListingInput): number {
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO listings (user_id, complex_id, building, unit, area_m2, floor, price, contact, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(userId, v.complexId, v.building.trim(), v.unit.trim(), v.areaM2, v.floor, v.price, v.contact.trim(), v.description.trim(), now());
  return Number(lastInsertRowid);
}

/** 내 매물만 지운다. 지웠으면 true */
export function removeListing(userId: number, id: number): boolean {
  return db.prepare("DELETE FROM listings WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

// ── 내 계획 ─────────────────────────────────────────────────────

export function planOf(userId: number): Map<string, { done: boolean; memo: string; updatedAt: string }> {
  const rows = db.prepare("SELECT step_id, done, memo, updated_at FROM plan_items WHERE user_id = ?").all(userId) as {
    step_id: string;
    done: number;
    memo: string;
    updated_at: string;
  }[];
  return new Map(rows.map((r) => [r.step_id, { done: r.done === 1, memo: r.memo, updatedAt: r.updated_at }]));
}

export function savePlanStep(userId: number, stepId: string, done: boolean, memo: string): void {
  db.prepare(
    `INSERT INTO plan_items (user_id, step_id, done, memo, updated_at) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (user_id, step_id) DO UPDATE SET done = excluded.done, memo = excluded.memo, updated_at = excluded.updated_at`,
  ).run(userId, stepId, done ? 1 : 0, memo, now());
}

// ── 메시지 ──────────────────────────────────────────────────────

interface MessageRow {
  id: number;
  sender: string;
  subject: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

const toMessage = (r: MessageRow): Message => ({ id: r.id, sender: r.sender, subject: r.subject, body: r.body, createdAt: r.created_at, read: r.read_at !== null });

export function sendMessage(userId: number, sender: string, subject: string, body: string, at = now()): void {
  db.prepare("INSERT INTO messages (user_id, sender, subject, body, created_at) VALUES (?, ?, ?, ?, ?)").run(userId, sender, subject, body, at);
}

export function messagesOf(userId: number): Message[] {
  return (db.prepare("SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(userId) as unknown as MessageRow[]).map(toMessage);
}

export function unreadCount(userId: number): number {
  return (db.prepare("SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND read_at IS NULL").get(userId) as { n: number }).n;
}

/** 내 메시지만 읽음으로. 없으면 null */
export function readMessage(userId: number, id: number): Message | null {
  db.prepare("UPDATE messages SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?").run(now(), id, userId);
  const row = db.prepare("SELECT * FROM messages WHERE id = ? AND user_id = ?").get(id, userId) as MessageRow | undefined;
  return row ? toMessage(row) : null;
}

export function deleteMessage(userId: number, id: number): boolean {
  return db.prepare("DELETE FROM messages WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

// ── 문의 (고객센터 · 광고) ──────────────────────────────────────

export function addInquiry(userId: number | null, v: InquiryInput): number {
  const { lastInsertRowid } = db
    .prepare(
      "INSERT INTO inquiries (kind, user_id, name, email, phone, company, category, subject, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .run(v.kind, userId, v.name.trim(), v.email.trim().toLowerCase(), v.phone.trim(), v.company.trim(), v.category, v.subject.trim(), v.body.trim(), now());
  return Number(lastInsertRowid);
}

// ── 검색 저장 ───────────────────────────────────────────────────

export interface SavedSearch {
  id: number;
  name: string;
  query: string;
  createdAt: string;
}

export function savedSearchesOf(userId: number): SavedSearch[] {
  return (db.prepare("SELECT id, name, query, created_at FROM saved_searches WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(userId) as {
    id: number;
    name: string;
    query: string;
    created_at: string;
  }[]).map((r) => ({ id: r.id, name: r.name, query: r.query, createdAt: r.created_at }));
}

/** 같은 주소를 또 저장하면 새로 만들지 않고 이름 · 시각만 바꾼다 */
export function saveSearch(userId: number, name: string, query: string): void {
  const same = db.prepare("SELECT id FROM saved_searches WHERE user_id = ? AND query = ?").get(userId, query) as { id: number } | undefined;
  if (same) db.prepare("UPDATE saved_searches SET name = ?, created_at = ? WHERE id = ?").run(name, now(), same.id);
  else db.prepare("INSERT INTO saved_searches (user_id, name, query, created_at) VALUES (?, ?, ?, ?)").run(userId, name, query, now());
}

export function deleteSavedSearch(userId: number, id: number): boolean {
  return db.prepare("DELETE FROM saved_searches WHERE id = ? AND user_id = ?").run(id, userId).changes > 0;
}

// ── 내 예산 ─────────────────────────────────────────────────────

export function budgetOf(userId: number): BudgetInput | null {
  const r = db.prepare("SELECT * FROM budgets WHERE user_id = ?").get(userId) as
    | { sido: string; sgg: string | null; income: number; cash: number; monthly_debt: number; rate: number; years: number }
    | undefined;
  return r ? { sido: r.sido, sgg: r.sgg, income: r.income, cash: r.cash, monthlyDebt: r.monthly_debt, rate: r.rate, years: r.years } : null;
}

export function saveBudget(userId: number, v: BudgetInput): void {
  db.prepare(
    `INSERT INTO budgets (user_id, sido, sgg, income, cash, monthly_debt, rate, years, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET sido = excluded.sido, sgg = excluded.sgg, income = excluded.income, cash = excluded.cash,
       monthly_debt = excluded.monthly_debt, rate = excluded.rate, years = excluded.years, updated_at = excluded.updated_at`,
  ).run(userId, v.sido, v.sgg, v.income, v.cash, v.monthlyDebt, v.rate, v.years, now());
}

// ── 내 문의 조회 ────────────────────────────────────────────────

export interface InquiryRecord {
  ticket: string;
  kind: "help" | "advertise";
  category: string;
  company: string;
  subject: string;
  body: string;
  createdAt: string;
  status: "답변 대기";
}

interface InquiryRow {
  id: number;
  kind: "help" | "advertise";
  category: string;
  company: string;
  subject: string;
  body: string;
  created_at: string;
}

/** 접수번호: 고객센터 H-00001 · 광고 A-00002 (번호는 문의 전체에서 하나씩 늘어난다) */
export const ticketOf = (kind: "help" | "advertise", id: number) => `${kind === "help" ? "H" : "A"}-${String(id).padStart(5, "0")}`;

// 답변하는 관리자 화면이 아직 없어 상태는 늘 "답변 대기"다
const toRecord = (r: InquiryRow): InquiryRecord => ({
  ticket: ticketOf(r.kind, r.id),
  kind: r.kind,
  category: r.category,
  company: r.company,
  subject: r.subject,
  body: r.body,
  createdAt: r.created_at,
  status: "답변 대기",
});

/** 로그인한 회원이 남긴 문의 (고객센터 · 광고 모두) */
export function inquiriesOf(userId: number): InquiryRecord[] {
  return (db.prepare("SELECT * FROM inquiries WHERE user_id = ? ORDER BY created_at DESC, id DESC").all(userId) as unknown as InquiryRow[]).map(toRecord);
}

/** 로그인 없이 낸 문의 조회: 접수번호와 그때 적은 이메일이 둘 다 맞아야 보여 준다 */
export function findInquiry(ticket: string, email: string): InquiryRecord | null {
  const m = /^([HA])-(\d{1,9})$/.exec(ticket.trim().toUpperCase());
  if (!m) return null;
  const row = db.prepare("SELECT * FROM inquiries WHERE id = ? AND kind = ? AND email = ?").get(Number(m[2]), m[1] === "H" ? "help" : "advertise", email.trim().toLowerCase()) as
    | InquiryRow
    | undefined;
  return row ? toRecord(row) : null;
}

// ── 최근 본 단지 (첫 화면 추천에 쓴다) ──
export const RECENT_MAX = 10;

/** 본 단지를 맨 앞에 두고, 오래된 것은 RECENT_MAX 개만 남기고 지운다 */
export function rememberRecentView(userId: number, complexId: string): void {
  transaction(() => {
    db.prepare(
      "INSERT INTO recent_views (user_id, complex_id, viewed_at) VALUES (?, ?, ?) ON CONFLICT (user_id, complex_id) DO UPDATE SET viewed_at = excluded.viewed_at",
    ).run(userId, complexId, now());
    db.prepare(
      "DELETE FROM recent_views WHERE user_id = ? AND complex_id NOT IN (SELECT complex_id FROM recent_views WHERE user_id = ? ORDER BY viewed_at DESC LIMIT ?)",
    ).run(userId, userId, RECENT_MAX);
  });
}

/** 최근 본 단지 id (최근 것이 앞) */
export function recentViewIds(userId: number): string[] {
  return (db.prepare("SELECT complex_id FROM recent_views WHERE user_id = ? ORDER BY viewed_at DESC LIMIT ?").all(userId, RECENT_MAX) as { complex_id: string }[]).map((r) => r.complex_id);
}
