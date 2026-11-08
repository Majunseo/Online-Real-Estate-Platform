/**
 * 지역 · 구매자 구분에 따른 주택담보대출 LTV 와 한도. 화면(대출 계산 · 내 예산)과 서버가 같은 표를 본다.
 *
 * 기준: 2025.10.15 주택시장 안정화 대책 (10.16 시행) + 2025.6.27 가계부채 관리 방안.
 *   - 규제지역(투기과열지구 · 조정대상지역): 서울 25개 구 전체, 경기 12곳
 *     (과천 · 광명 · 성남 분당 · 수정 · 중원 · 수원 영통 · 장안 · 팔달 · 안양 동안 · 용인 수지 · 의왕 · 하남)
 *   - 규제지역 LTV 40% (생애최초 70%). 한도는 집값에 따라 15억 이하 6억, 15~25억 4억, 25억 초과 2억
 *   - 수도권 비규제(경기 나머지 · 인천): LTV 70%, 한도 6억
 *   - 지방: LTV 70% (1주택 이상 60%), 한도 없음
 *   - 2주택 이상은 수도권 · 규제지역에서 주택 구입용 주담대가 나오지 않는다
 * 규제는 바뀌므로 이 파일만 고치면 된다. 실제 한도는 은행 심사 · 소득 · DSR 에 따라 더 줄 수 있다.
 */
export const RULE_BASIS = "2025.10.15 대책 기준";

/** 경기도 안의 규제지역 시군구 코드 (서울은 전체) */
export const REGULATED_SGG = new Set([
  "41290", // 과천시
  "41210", // 광명시
  "41135", // 성남시 분당구
  "41131", // 성남시 수정구
  "41133", // 성남시 중원구
  "41117", // 수원시 영통구
  "41111", // 수원시 장안구
  "41115", // 수원시 팔달구
  "41173", // 안양시 동안구
  "41465", // 용인시 수지구
  "41430", // 의왕시
  "41450", // 하남시
]);

export type Zone = "regulated" | "metro" | "other";
export type Buyer = "none" | "first" | "one" | "multi";

export const BUYERS: { value: Buyer; label: string }[] = [
  { value: "none", label: "무주택" },
  { value: "first", label: "생애최초" },
  { value: "one", label: "1주택 (기존 집 처분)" },
  { value: "multi", label: "2주택 이상" },
];

export const ZONE_LABEL: Record<Zone, string> = { regulated: "규제지역", metro: "수도권 (비규제)", other: "비규제 지역" };

/**
 * 시도 · 시군구 코드로 지역 구분. 시도가 없으면 null.
 * 경기는 시군구까지 골라야 규제지역인지 알 수 있다 (안 골랐으면 수도권 비규제로 보고 uncertain 을 켠다).
 */
export function zoneOf(sido: string | null | undefined, sgg: string | null | undefined): { zone: Zone; uncertain: boolean } | null {
  if (!sido) return null;
  if (sido === "11") return { zone: "regulated", uncertain: false };
  if (sido === "41") return sgg ? { zone: REGULATED_SGG.has(sgg) ? "regulated" : "metro", uncertain: false } : { zone: "metro", uncertain: true };
  if (sido === "28") return { zone: "metro", uncertain: false };
  return { zone: "other", uncertain: false };
}

export interface LtvRule {
  zone: Zone;
  buyer: Buyer;
  /** 0~1. 0 이면 주택 구입용 대출이 안 나온다 */
  ltv: number;
  /** 대출 한도 (만원). null 은 한도 없음 */
  cap: number | null;
  /** 함께 보여 줄 조건 */
  note: string;
}

const LTV_TABLE: Record<Zone, Record<Buyer, number>> = {
  regulated: { none: 0.4, first: 0.7, one: 0.4, multi: 0 },
  metro: { none: 0.7, first: 0.7, one: 0.7, multi: 0 },
  other: { none: 0.7, first: 0.7, one: 0.6, multi: 0.6 },
};

/** 규제지역 한도: 집값(만원)에 따라 6억 · 4억 · 2억 */
const regulatedCap = (price: number) => (price <= 150_000 ? 60_000 : price <= 250_000 ? 40_000 : 20_000);

export function ltvRule(zone: Zone, buyer: Buyer, price: number): LtvRule {
  const ltv = LTV_TABLE[zone][buyer];
  const cap = ltv === 0 ? 0 : zone === "regulated" ? regulatedCap(price) : zone === "metro" ? 60_000 : null;
  const note =
    ltv === 0
      ? "수도권 · 규제지역에서는 2주택 이상 주택 구입용 담보대출이 나오지 않아요."
      : buyer === "first"
        ? "생애최초는 규제지역에서도 LTV 70%예요. 대출 뒤 6개월 안에 전입해야 해요."
        : buyer === "one"
          ? "기존 집을 6개월 안에 처분하는 조건이에요."
          : zone === "regulated"
            ? "서울 전역 · 경기 12곳은 규제지역이라 LTV 40%예요."
            : zone === "metro"
              ? "수도권은 한도 6억 원이 함께 적용돼요."
              : "지방 비규제 지역이라 LTV 70%예요.";
  return { zone, buyer, ltv, cap, note };
}

/** 이 조건에서 빌릴 수 있는 최대 금액 (만원) */
export function maxLoan(price: number, rule: LtvRule): number {
  const byLtv = Math.floor(price * rule.ltv);
  return rule.cap === null ? byLtv : Math.min(byLtv, rule.cap);
}
