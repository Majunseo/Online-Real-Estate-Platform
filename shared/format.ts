/** 화면과 서버가 함께 쓰는 금액 표기. 실거래가 API 는 금액을 만원 단위로 준다. */

/** 만원 → "12억 3,500" · "9,800만" · "3억" */
export function formatManwon(manwon: number): string {
  const eok = Math.floor(manwon / 10000);
  const rest = manwon % 10000;
  if (eok === 0) return `${rest.toLocaleString("ko-KR")}만`;
  if (rest === 0) return `${eok}억`;
  return `${eok}억 ${rest.toLocaleString("ko-KR")}`;
}
