import type { LucideIcon } from "lucide-react";
import { Heart, Inbox, ListChecks, Search, Bell } from "lucide-react";
import { SIDO } from "@shared/regions";

/**
 * 사이트 전체에서 쓰는 이름 · 메뉴 · 링크. 메뉴를 빼거나 바꿀 때 이 파일만 고친다.
 * 아직 화면이 없는 주소는 App 의 ComingSoon 이 받는다.
 */
export const SITE = {
  name: "집터",
  /** 대출 계산 위젯 머리에 붙는 이름 */
  loanName: "집터 대출 계산",
};

export interface NavItem {
  label: string;
  to: string;
}

/** 머리글 왼쪽 메뉴 */
export const NAV_LEFT: NavItem[] = [
  { label: "매매", to: "/search" },
  { label: "실거래가", to: "/deals" },
  { label: "대출 계산", to: "/loan" },
  { label: "중개사 찾기", to: "/agents" },
];

/** 머리글 오른쪽 메뉴 (로그인 단추 앞) */
export const NAV_RIGHT: NavItem[] = [
  { label: "내 집 내놓기", to: "/sell" },
  { label: "광고 문의", to: "/advertise" },
  { label: "고객센터", to: "/help" },
];

export interface RailItem extends NavItem {
  icon: LucideIcon;
}

/** 화면 왼쪽 세로 아이콘 줄 */
export const RAIL: RailItem[] = [
  { label: "검색", to: "/search", icon: Search },
  { label: "새 소식", to: "/updates", icon: Bell },
  { label: "관심 단지", to: "/favorites", icon: Heart },
  { label: "내 계획", to: "/plan", icon: ListChecks },
  { label: "메시지", to: "/inbox", icon: Inbox },
];

export interface FooterGroup {
  title: string;
  links: NavItem[];
  /** 링크가 많으면 2열로 펼친다 */
  twoColumns?: boolean;
}

/** 바닥글의 펼치는 묶음 */
export const FOOTER_GROUPS: FooterGroup[] = [
  {
    // 모든 시도에 실거래 자료가 있다. 누르면 검색 지도에서 그 시도를 고른 화면으로 간다
    title: "지역별 아파트",
    links: SIDO.map((s) => ({ label: `${s.short} 아파트`, to: `/search?sido=${s.code}` })),
    twoColumns: true,
  },
  {
    title: "실거래가",
    links: [
      { label: "이번 달 실거래", to: "/deals?period=month" },
      { label: "최고가 경신 거래", to: "/deals?filter=record" },
      { label: "비싸게 거래된 순", to: "/deals?sort=price-desc" },
      { label: "계약 해제 거래", to: "/deals?filter=canceled" },
    ],
  },
  {
    title: "대출 금리",
    links: [
      { label: "주택담보대출 금리", to: "/loan/rates" },
      { label: "대출 한도 계산", to: "/loan" },
    ],
  },
  {
    title: "단지 둘러보기",
    links: [
      { label: "새 아파트 (5년 이내)", to: `/search?builtMin=${new Date().getFullYear() - 5}` },
      { label: "대단지 (1,000세대 이상)", to: "/search?householdsMin=1000" },
      { label: "역세권", to: "/search?near=station" },
      { label: "초등학교 가까운 단지 (300m)", to: "/search?school=e&schoolDist=300" },
    ],
  },
];

/** 바닥글 한 줄 링크 */
export const FOOTER_LINKS: NavItem[] = [
  { label: "회사 소개", to: "/about" },
  { label: "시세 산정 방식", to: "/about/pricing" },
  { label: "공지사항", to: "/notice" },
  { label: "고객센터", to: "/help" },
  { label: "광고 문의", to: "/advertise" },
  { label: "이용약관", to: "/terms" },
  { label: "개인정보처리방침", to: "/privacy" },
  { label: "위치기반서비스 이용약관", to: "/terms/location" },
];
