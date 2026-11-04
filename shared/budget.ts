/**
 * 내 예산(살 수 있는 가격) 계산. 첫 화면 "내 예산으로 살 수 있는 단지 찾기" 의 모달이 쓰고, 서버가 같은 식으로 다시 계산한다.
 * 금액은 모두 만원 단위.
 *
 *   한 해 갚을 수 있는 돈 = 연소득 × DSR 비율 − 지금 다른 대출의 한 해 상환액
 *   빌릴 수 있는 돈       = 그 돈을 금리 · 기간으로 원리금균등 상환할 때의 원금
 *   살 수 있는 가격       = 보유 현금 + 빌릴 수 있는 돈 (단, 대출은 매매가의 LTV 70% 까지)
 *
 * 목표 매매가는 DSR 30%(여유 있게), 최대 매매가는 DSR 40%(은행 규제 한도)로 계산한다.
 * 실제 한도는 지역 규제 · 소득 증빙 · 은행에 따라 달라 "예상" 으로만 보여 준다.
 */
export const DSR_TARGET = 0.3;
export const DSR_MAX = 0.4;
export const LTV = 0.7;

export interface BudgetInput {
  sido: string; // 관심 지역 시도 코드 (필수)
  sgg: string | null; // 관심 지역 시군구 코드 (선택)
  income: number; // 세전 연소득
  cash: number; // 보유 현금 (계약금 · 자기자금)
  monthlyDebt: number; // 지금 다른 대출의 월 상환액
  rate: number; // 예상 연 금리 %
  years: number; // 대출 기간
}

export interface BudgetResult {
  target: number; // 목표 매매가
  max: number; // 최대 매매가
  targetMonthly: number; // 목표 매매가로 샀을 때 월 상환액 (만원)
  targetLoan: number;
}

export type BudgetErrors = Partial<Record<keyof BudgetInput, string>>;

export function validateBudget(v: BudgetInput): BudgetErrors {
  const e: BudgetErrors = {};
  if (!/^\d{2}$/.test(v.sido)) e.sido = "관심 지역을 골라 주세요.";
  if (!(v.income > 0) || v.income > 1_000_000) e.income = "세전 연소득을 만 원 단위로 입력해 주세요.";
  if (!(v.cash >= 0) || v.cash > 10_000_000) e.cash = "보유 현금을 만 원 단위로 입력해 주세요. 없으면 0";
  else if (v.cash < 1_000) e.cash = "계약금으로 최소 1,000만 원은 있어야 계산할 수 있어요.";
  if (!(v.monthlyDebt >= 0) || v.monthlyDebt > 100_000) e.monthlyDebt = "다른 대출의 월 상환액을 입력해 주세요. 없으면 0";
  if (!(v.rate > 0) || v.rate > 20) e.rate = "금리는 0보다 크고 20% 이하로 입력해 주세요.";
  if (!Number.isInteger(v.years) || v.years < 1 || v.years > 50) e.years = "기간은 1~50년 사이로 골라 주세요.";
  return e;
}

/** 월 상환액 m(만원)으로 갚을 수 있는 원금 (원리금균등) */
function principalFor(monthly: number, ratePercent: number, years: number): number {
  const r = ratePercent / 100 / 12;
  const n = years * 12;
  return r === 0 ? monthly * n : (monthly * (1 - (1 + r) ** -n)) / r;
}

/** 원금 p 의 월 상환액 (원리금균등) */
export function monthlyFor(p: number, ratePercent: number, years: number): number {
  const r = ratePercent / 100 / 12;
  const n = years * 12;
  return r === 0 ? p / n : (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);
}

function priceAt(v: BudgetInput, dsr: number): number {
  const monthlyCap = Math.max(0, (v.income * dsr - v.monthlyDebt * 12) / 12);
  const loan = principalFor(monthlyCap, v.rate, v.years);
  // 대출은 매매가의 LTV 까지: 가격 ≤ 현금 + 대출, 그리고 대출 ≤ 가격 × LTV → 가격 ≤ 현금 ÷ (1 − LTV)
  return Math.floor(Math.min(v.cash + loan, v.cash / (1 - LTV)) / 100) * 100;
}

export function computeBudget(v: BudgetInput): BudgetResult {
  const target = priceAt(v, DSR_TARGET);
  const max = Math.max(target, priceAt(v, DSR_MAX));
  const targetLoan = Math.max(0, target - v.cash);
  return { target, max, targetMonthly: Math.round(monthlyFor(targetLoan, v.rate, v.years)), targetLoan };
}
