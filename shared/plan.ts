/** 내 계획: 아파트를 사기까지의 단계. 순서를 바꾸거나 단계를 더할 때 이 배열만 고친다 */
export interface PlanStepDef {
  id: string;
  title: string;
  description: string;
  link?: { label: string; to: string };
}

export const PLAN_STEPS: PlanStepDef[] = [
  { id: "budget", title: "예산 정하기", description: "모아 둔 돈과 매달 갚을 수 있는 금액으로 살 수 있는 가격대를 정해요.", link: { label: "대출 계산하기", to: "/loan" } },
  { id: "loan", title: "대출 알아보기", description: "금리와 상환 방식에 따라 월 상환액이 얼마나 달라지는지 비교해요.", link: { label: "금리별 상환액 보기", to: "/loan/rates" } },
  { id: "area", title: "지역 고르기", description: "출퇴근 · 학교 · 생활권을 기준으로 살고 싶은 동네를 좁혀요.", link: { label: "지도에서 찾기", to: "/search" } },
  { id: "compare", title: "단지 비교하기", description: "관심 단지에 담아 두고 최근 실거래가와 면적별 가격을 비교해요.", link: { label: "관심 단지 보기", to: "/favorites" } },
  { id: "visit", title: "현장 둘러보기", description: "직접 가서 단지 · 주변 환경 · 집 상태를 확인해요." },
  { id: "agent", title: "중개사 상담", description: "원하는 조건의 매물이 있는지 중개사무소에 문의해요.", link: { label: "중개사 찾기", to: "/agents" } },
  { id: "contract", title: "계약하기", description: "등기부등본으로 권리관계를 확인하고 매매계약서를 써요." },
  { id: "move", title: "잔금 · 이사", description: "잔금을 치르고 소유권 이전 등기와 전입신고를 마쳐요." },
];
