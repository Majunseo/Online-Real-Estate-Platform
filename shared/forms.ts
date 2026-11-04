/**
 * 내 집 내놓기 · 고객센터 · 광고 문의 입력 규칙. 화면과 서버가 같은 함수를 쓴다.
 * 검사 함수는 문제가 없으면 null, 있으면 화면에 보여 줄 문장을 돌려준다.
 */
import { validateEmail } from "./auth";

export const PRICE_MIN = 1_000; // 1천만 원 (만원 단위)
export const PRICE_MAX = 1_000_000; // 100억 원
export const DESCRIPTION_MAX = 500;
export const BODY_MAX = 2_000;

/** 휴대폰 · 지역번호 · 대표번호. 숫자와 하이픈만, 하이픈은 있어도 없어도 된다 */
export function validatePhone(phone: string, required = true): string | null {
  const p = phone.trim();
  if (!p) return required ? "연락처를 입력해 주세요." : null;
  if (!/^(01[016789]|0[2-6][0-9]?|070|050[0-9]|1[568][0-9]{2})-?\d{3,4}-?\d{4}$/.test(p) && !/^1[568]\d{2}-?\d{4}$/.test(p)) {
    return "연락처 형식이 올바르지 않아요. 예: 010-1234-5678";
  }
  return null;
}

const text = (label: string, value: string, max: number, required = true) => {
  const v = value.trim();
  if (!v) return required ? `${label}을(를) 입력해 주세요.` : null;
  if (v.length > max) return `${label}은(는) ${max}자까지 쓸 수 있어요.`;
  return null;
};

export interface ListingInput {
  complexId: string;
  building: string; // 동
  unit: string; // 호
  areaM2: number;
  floor: number;
  price: number; // 만원
  contact: string;
  description: string;
}

export type ListingErrors = Partial<Record<keyof ListingInput, string>>;

/** maxFloor: 건축물대장의 단지 최고층 (알면 그보다 높은 층은 막는다) */
export function validateListing(v: ListingInput, maxFloor?: number): ListingErrors {
  const e: ListingErrors = {};
  if (!v.complexId) e.complexId = "단지를 골라 주세요.";
  if (!/^\d{1,4}$/.test(v.building.trim())) e.building = "동은 숫자로 입력해 주세요. 예: 101";
  if (!/^\d{1,4}$/.test(v.unit.trim())) e.unit = "호는 숫자로 입력해 주세요. 예: 1203";
  if (!(v.areaM2 > 0)) e.areaM2 = "전용면적을 골라 주세요.";
  if (!Number.isInteger(v.floor) || v.floor < 1 || v.floor > 99) e.floor = "층은 1~99 사이 숫자로 입력해 주세요.";
  else if (maxFloor && v.floor > maxFloor) e.floor = `이 단지의 최고층은 ${maxFloor}층이에요 (건축물대장).`;
  if (!Number.isInteger(v.price) || v.price < PRICE_MIN || v.price > PRICE_MAX) e.price = "희망 가격은 1,000만 원 이상 100억 원 이하로 입력해 주세요.";
  const phone = validatePhone(v.contact);
  if (phone) e.contact = phone;
  const desc = text("설명", v.description, DESCRIPTION_MAX, false);
  if (desc) e.description = desc;
  return e;
}

export interface InquiryInput {
  kind: "help" | "advertise";
  name: string;
  email: string;
  phone: string;
  company: string;
  category: string;
  subject: string;
  body: string;
}

export type InquiryErrors = Partial<Record<keyof InquiryInput, string>>;

export const HELP_CATEGORIES = ["회원 · 로그인", "실거래가 · 시세", "관심 단지 · 알림", "내 집 내놓기", "기타"];

export function validateInquiry(v: InquiryInput): InquiryErrors {
  const e: InquiryErrors = {};
  const set = (k: keyof InquiryInput, msg: string | null) => msg && (e[k] = msg);
  set("name", text("이름", v.name, 20));
  set("email", validateEmail(v.email));
  set("subject", text("제목", v.subject, 80));
  set("body", text("내용", v.body, BODY_MAX));
  if (v.kind === "help" && !HELP_CATEGORIES.includes(v.category)) e.category = "문의 종류를 골라 주세요.";
  if (v.kind === "advertise") {
    set("company", text("회사 이름", v.company, 40));
    set("phone", validatePhone(v.phone));
  }
  return e;
}
