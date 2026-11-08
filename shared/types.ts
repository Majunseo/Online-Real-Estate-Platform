import type { ListFilter } from "./filters";

/** 화면과 서버가 함께 쓰는 자료 형식. 실거래가 API(국토교통부 아파트 매매 상세 자료) 항목을 바탕으로 한다. */

/** 최근 실거래 한 건. 금액은 만원 단위 정수, 면적은 전용면적 ㎡ */
export interface Deal {
  amount: number; // dealAmount (만원)
  areaM2: number; // excluUseAr
  floor: number; // floor
  date: string; // dealYear-dealMonth-dealDay (YYYY-MM-DD)
  dealingType: "중개거래" | "직거래"; // dealingGbn
  canceled: boolean; // cdealType 이 있으면 계약 해제
}

/** 건축물대장 표제부로 모은 단지 정보 (세대가 있는 공동주택 동 기준) */
export interface BuildingInfo {
  households: number; // 세대수
  dongs: number; // 아파트 동 수
  maxFloor: number; // 최고층 (지상)
  approvedAt: string | null; // 사용승인일 YYYY-MM-DD
  elevators: number; // 승강기 (승용 + 비상용)
  parking: number; // 주차 대수 (옥내 · 옥외 · 기계식 합)
}

/** 카드 왼쪽 위 표시 */
export interface Badge {
  kind: "drop" | "record" | "new" | "budget";
  label: string;
}

/** 아파트 단지 한 곳. id 는 aptSeq (단지 일련번호) */
export interface Complex {
  id: string;
  name: string; // aptNm
  sido: string;
  sgg: string;
  umd: string; // umdNm (법정동)
  sggCode: string; // 좌표로 찾은 시군구 (경계 파일 기준, LAWD_CD 와 같다)
  dongCode: string | null; // 좌표로 찾은 행정동 (10자리)
  dong: string | null; // 행정동 이름
  jibun: string;
  buildYear: number;
  lat: number;
  lng: number;
  latest: Deal; // 계약 해제가 아닌 가장 최근 거래
  dealCount: number; // 스냅숏 기간의 거래 수 (해제 제외)
  /** 건축물대장 정보. 아직 받지 않았거나 그 지번에 공동주택이 없으면 없다 */
  building?: BuildingInfo;
  /** 가장 가까운 지하철역 (직선 1km 안에 역이 없으면 없다) */
  station?: NearStation;
  /** 학교급 × 설립(국공립 · 사립)별 1km 안 가장 가까운 학교 (가까운 순, 없으면 없다) */
  schools?: NearSchool[];
  badge?: Badge;
}

/** e 초등학교 · m 중학교 · h 고등학교 */
export type SchoolLevel = "e" | "m" | "h";
/** public 은 국립 · 공립을 묶은 것 */
export type SchoolOwner = "public" | "private";

export interface NearSchool {
  name: string;
  level: SchoolLevel;
  owner: SchoolOwner;
  distanceM: number; // 단지 좌표와 학교 좌표 사이 직선 거리
}

/** GET /api/stations: 지도에 찍을 역 [이름, 노선들, 위도, 경도] */
export interface StationsResult {
  stations: [string, string[], number, number][];
}

/** 단지에서 가장 가까운 역. distanceM 은 단지 좌표와 역 중심 좌표 사이 직선 거리 */
export interface NearStation {
  name: string; // "공덕" (화면에서 "역"을 붙인다)
  lines: string[];
  distanceM: number;
}

export interface HomeData {
  /** reason: 왜 이 단지들을 골랐는지 (화면 부제목에 그대로 쓴다) */
  /** basis: 현재 위치 근처(location)인지, 위치가 없어 요즘 거래가 많은 단지(popular)인지 */
  recommended: { basis: "location" | "popular"; items: Complex[]; reason: string };
  budget: Complex[];
  regional: { region: string; sggCode: string; items: Complex[]; reason: string };
}

export type SortKey = "recent" | "price-desc" | "price-asc" | "area-desc";

export interface RegionRef {
  code: string;
  name: string;
}

/** 지금 고른 지역. 시도 › 시군구 › 동 순서로 채워진다 */
export interface RegionPath {
  sido?: RegionRef;
  sgg?: RegionRef;
  dong?: RegionRef;
}

/** 검색 조건. sgg 는 sido 안, dong 은 sgg 안이어야 한다 (서버가 맞춘다) */
export interface SearchFilter {
  sido: string | null;
  sgg: string | null;
  dong: string | null;
  q: string;
  /** 검색 줄 조건 (shared/filters). 없으면 거르지 않는다 */
  list?: ListFilter;
}

/** GET /api/complexes 응답 */
export interface SearchResult {
  region: RegionPath;
  q: string;
  total: number;
  items: Complex[]; // 앞에서 limit 곳
  info: DataInfo;
}

/** GET /api/complexes/points 응답: 지도에 찍을 점 전부. [단지 id, 위도, 경도, 최근 실거래가(만원)] */
/** 지역 묶음 한 개: 지도에 "치평동 18 · 4.2억" 처럼 뜬다. 위치는 그 지역 단지들 좌표의 평균 */
export interface RegionBubble {
  code: string;
  name: string;
  count: number;
  /** 최근 실거래가 중간값 (만원) */
  median: number;
  lat: number;
  lng: number;
}

export type BubbleLevel = "sido" | "sgg" | "dong";

/** GET /api/complexes/summary 응답 */
export interface SummaryResult {
  level: BubbleLevel;
  items: RegionBubble[];
}

export interface PointsResult {
  points: [string, number, number, number][];
}

/** GET /api/regions 응답: 한 단계 아래 지역과 단지 수 (0 이면 아직 실거래가를 받지 않은 곳) */
export interface RegionsResult {
  parent: RegionPath;
  items: (RegionRef & { count: number })[];
}

/** GET /api/complexes/:id — 단지 하나와 스냅숏 기간의 거래 전부 (최근부터) */
export interface ComplexDetail {
  complex: Complex;
  roadAddress: string;
  deals: Deal[];
  /** 거래가 있었던 전용면적 (㎡, 반올림 · 작은 순) */
  areas: number[];
  /** 같은 시군구의 다른 단지 몇 곳 (최근 거래순) */
  nearby: Complex[];
}

/** 실거래가 목록 한 줄 */
export interface DealRow {
  complexId: string;
  complexName: string;
  sido: string;
  sgg: string;
  umd: string;
  deal: Deal;
  /** 최고가 경신: 같은 단지 · 같은 면적의 앞선 거래(2건 이상) 모두보다 높은 거래 */
  record: boolean;
}

export type DealFilter = "all" | "record" | "canceled";
export type DealPeriod = "all" | "month";
/** 실거래가 목록 정렬: 최근 계약순 · 가격 높은 순 */
export type DealSort = "recent" | "price-desc";

/** 실거래가 자료 출처 · 범위. 바닥글의 "자료 기준" 줄과 검색 결과가 함께 쓴다 */
export interface DataInfo {
  source: string;
  /** 받아 온 시각 (ISO). 스냅숏이 없으면 null */
  fetchedAt: string | null;
  months: string[];
  sggCount: number;
}

/** 실거래가 목록의 전용면적 범위 (㎡). null 은 제한 없음 */
export interface AreaRange {
  areaMin: number | null;
  areaMax: number | null;
}

/** GET /api/deals */
export interface DealsResult {
  region: RegionPath;
  /** 단지 · 동 이름 검색어 (정리한 값) */
  q: string;
  area: AreaRange;
  filter: DealFilter;
  period: DealPeriod;
  sort: DealSort;
  /** 기간 계산의 기준이 된 가장 최근 계약일 */
  newestDate: string;
  total: number;
  page: number;
  pageSize: number;
  items: DealRow[];
}

/** GET /api/updates — 새 소식 한 건 */
export interface UpdateItem {
  kind: "favorite-deal" | "drop" | "record";
  complex: Complex;
  deal: Deal;
  text: string;
}

/** GET /api/agents — 중개사무소 (화면 확인용 가상 자료) */
export interface Agent {
  id: string;
  name: string;
  owner: string;
  sido: string;
  sgg: string;
  address: string;
  phone: string;
  specialties: string[];
  /** 이 시군구에서 스냅숏 기간에 중개거래로 신고된 아파트 매매 수 (실제 자료) */
  sggBrokeredDeals: number;
}

/** 내 집 내놓기 매물 */
export interface Listing {
  id: number;
  complexId: string;
  complexName: string;
  address: string;
  building: string;
  unit: string;
  areaM2: number;
  floor: number;
  price: number; // 만원
  contact: string;
  description: string;
  createdAt: string;
}

/** 내 계획 한 단계 */
export interface PlanStep {
  id: string;
  title: string;
  description: string;
  link?: { label: string; to: string };
  done: boolean;
  memo: string;
  updatedAt: string | null;
}

/** 메시지함 한 통 */
export interface Message {
  id: number;
  sender: string;
  subject: string;
  body: string;
  createdAt: string;
  read: boolean;
}
