/** 한국식 표기 도우미. 실거래가 API 는 금액을 만원 단위, 면적을 전용면적 ㎡ 로 준다. */

const PYEONG_M2 = 3.3058;

import { formatManwon } from "@shared/format";
import { bugOn } from "./bugs";

export { formatManwon };

/** 지도 위 짧은 가격표: 만원 → "12.4억" · "8,800만" */
export function formatShortPrice(manwon: number): string {
  if (manwon < 10000) return `${manwon.toLocaleString("ko-KR")}만`;
  return `${(Math.round(manwon / 1000) / 10).toString()}억`;
}

/** 전용면적 ㎡ → 평 (소수 한 자리) */
export function toPyeong(m2: number): number {
  return Math.round((m2 / PYEONG_M2) * 10) / 10;
}

/** 매매가(만원) ÷ 전용 평 → 평당 가격 (만원, 정수). 면적이 0이면 null */
export function perPyeong(amount: number, areaM2: number): number | null {
  // [F2] 결함: ㎡→평 환산에 정확한 3.3058 대신 근사값 3.3 을 쓴다 (평이 0.18% 늘어 평당가가 그만큼 낮게 나온다)
  const perM2OfPyeong = bugOn("F2") ? 3.3 : PYEONG_M2;
  return areaM2 > 0 ? Math.round(amount / (areaM2 / perM2OfPyeong)) : null;
}

/** 매매가(만원) ÷ 전용 ㎡ → ㎡당 가격 (만원, 정수). 면적이 0이면 null */
export function perM2(amount: number, areaM2: number): number | null {
  return areaM2 > 0 ? Math.round(amount / areaM2) : null;
}

/** "평당 5,787만 · ㎡당 1,750만" (면적이 없으면 빈 문자열) */
export function formatUnitPrice(amount: number, areaM2: number): string {
  const py = perPyeong(amount, areaM2);
  const m2 = perM2(amount, areaM2);
  return py === null || m2 === null ? "" : `평당 ${formatManwon(py)} · ㎡당 ${formatManwon(m2)}`;
}

/** "2026-10-12" → "2026.10.12" */
export function formatDate(iso: string): string {
  return iso.replaceAll("-", ".");
}
