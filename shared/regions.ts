/**
 * 시도 목록. code 는 법정동코드 앞 두 자리 (실거래가 API 의 LAWD_CD 앞자리와 같다).
 * 2026.7.1 광주광역시(29)와 전라남도(46)가 전남광주통합특별시(12)로 합쳐졌다.
 * 경계는 public/geo/sido.json (통계청 2013 시도 경계를 줄인 것, southkorea/southkorea-maps. 광주 · 전남은 한 덩어리로 합침).
 */
export interface Sido {
  code: string;
  name: string;
  short: string;
  /** 검색창에 이렇게 적어도 이 시도로 본다 */
  aliases?: string[];
}

export const SIDO: Sido[] = [
  { code: "11", name: "서울특별시", short: "서울" },
  { code: "26", name: "부산광역시", short: "부산" },
  { code: "27", name: "대구광역시", short: "대구" },
  { code: "28", name: "인천광역시", short: "인천" },
  { code: "30", name: "대전광역시", short: "대전" },
  { code: "31", name: "울산광역시", short: "울산" },
  { code: "36", name: "세종특별자치시", short: "세종" },
  { code: "41", name: "경기도", short: "경기" },
  { code: "51", name: "강원특별자치도", short: "강원" },
  { code: "43", name: "충청북도", short: "충북" },
  { code: "44", name: "충청남도", short: "충남" },
  { code: "52", name: "전북특별자치도", short: "전북" },
  { code: "12", name: "전남광주통합특별시", short: "전남광주", aliases: ["전남", "광주", "전라남도", "광주광역시"] },
  { code: "47", name: "경상북도", short: "경북" },
  { code: "48", name: "경상남도", short: "경남" },
  { code: "50", name: "제주특별자치도", short: "제주" },
];

export const sidoByCode = (code: string | null | undefined) => SIDO.find((s) => s.code === code);

/** "서울", "서울시", "서울특별시" 처럼 적어도 찾는다 */
export const sidoByName = (text: string) => {
  const t = text.trim();
  return t ? SIDO.find((s) => t === s.short || t === s.name || s.aliases?.includes(t) || s.name.startsWith(t)) : undefined;
};
