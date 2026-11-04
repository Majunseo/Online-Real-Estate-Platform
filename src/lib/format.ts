/** 한국식 표기 도우미. 실거래가 API 는 금액을 만원 단위, 면적을 전용면적 ㎡ 로 준다. */

const PYEONG_M2 = 3.3058;

export { formatManwon } from "@shared/format";

/** 지도 위 짧은 가격표: 만원 → "12.4억" · "8,800만" */
export function formatShortPrice(manwon: number): string {
  if (manwon < 10000) return `${manwon.toLocaleString("ko-KR")}만`;
  return `${(Math.round(manwon / 1000) / 10).toString()}억`;
}

/** 전용면적 ㎡ → 평 (소수 한 자리) */
export function toPyeong(m2: number): number {
  return Math.round((m2 / PYEONG_M2) * 10) / 10;
}

/** "2026-10-12" → "2026.10.12" */
export function formatDate(iso: string): string {
  return iso.replaceAll("-", ".");
}
