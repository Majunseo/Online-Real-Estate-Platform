/**
 * 주택담보대출 상환 계산. 금액은 원 단위 정수로 다룬다(만원 입력은 화면에서 바꿔 넣는다).
 *   원리금균등: 매달 같은 금액 (원금 + 이자)
 *   원금균등:   매달 같은 원금 + 남은 원금의 이자 → 처음이 가장 크고 점점 준다
 *   만기일시:   매달 이자만, 마지막 달에 원금 전부
 */
export type Method = "equal-payment" | "equal-principal" | "bullet";

export const METHODS: { value: Method; label: string; hint: string }[] = [
  { value: "equal-payment", label: "원리금균등", hint: "매달 같은 금액을 갚아요" },
  { value: "equal-principal", label: "원금균등", hint: "처음에 많이, 갈수록 적게 갚아요" },
  { value: "bullet", label: "만기일시", hint: "이자만 내다가 마지막에 원금을 갚아요" },
];

export interface Schedule {
  months: { payment: number; principal: number; interest: number; balance: number }[];
  firstPayment: number;
  lastPayment: number;
  totalInterest: number;
  totalPayment: number;
}

export function schedule(principal: number, annualRatePercent: number, years: number, method: Method): Schedule {
  const n = Math.round(years * 12);
  const r = annualRatePercent / 100 / 12;
  const months: Schedule["months"] = [];
  let balance = principal;
  const fixed = r === 0 ? principal / n : (principal * r * (1 + r) ** n) / ((1 + r) ** n - 1);
  for (let i = 1; i <= n; i++) {
    const interest = balance * r;
    let paid: number;
    if (method === "equal-payment") paid = i === n ? balance : fixed - interest;
    else if (method === "equal-principal") paid = i === n ? balance : principal / n;
    else paid = i === n ? balance : 0;
    balance -= paid;
    months.push({ payment: Math.round(paid + interest), principal: Math.round(paid), interest: Math.round(interest), balance: Math.max(0, Math.round(balance)) });
  }
  const totalInterest = months.reduce((s, m) => s + m.interest, 0);
  return {
    months,
    firstPayment: months[0]?.payment ?? 0,
    lastPayment: months.at(-1)?.payment ?? 0,
    totalInterest,
    totalPayment: principal + totalInterest,
  };
}

/** 연도별로 묶은 상환표 */
export function yearly(s: Schedule) {
  const out: { year: number; payment: number; principal: number; interest: number; balance: number }[] = [];
  s.months.forEach((m, i) => {
    const y = Math.floor(i / 12);
    out[y] ??= { year: y + 1, payment: 0, principal: 0, interest: 0, balance: 0 };
    out[y].payment += m.payment;
    out[y].principal += m.principal;
    out[y].interest += m.interest;
    out[y].balance = m.balance;
  });
  return out;
}

/** 원 → "123만 4,000원" · "1억 2,345만 원" (만원 아래는 버림) */
export function won(value: number): string {
  const man = Math.floor(value / 10_000);
  const eok = Math.floor(man / 10_000);
  const restMan = man % 10_000;
  if (eok && restMan) return `${eok}억 ${restMan.toLocaleString("ko-KR")}만 원`;
  if (eok) return `${eok}억 원`;
  if (man) return `${man.toLocaleString("ko-KR")}만 원`;
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}
