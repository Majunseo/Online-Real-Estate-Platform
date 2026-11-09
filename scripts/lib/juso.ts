/**
 * 행정안전부 도로명주소 API 로 주소 → 좌표 (business.juso.go.kr).
 *   1) 검색 API  addrLinkApi.do  : 키워드(도로명 · 지번) → 주소 레코드 (행정구역코드 · 도로명코드 · 건물번호 …)
 *   2) 좌표 API  addrCoordApi.do : 그 코드로 건물 출입구 좌표 (GRS80 UTM-K, EPSG:5179)
 *   3) UTM-K → WGS84 위도 · 경도 변환 (여기서 직접 계산, 외부 패키지 없음)
 * 공공데이터라 결과를 저장 · 재배포할 수 있다 (네이버 Geocoding 과 다른 점). 키는 .env 의 JUSO_CONFIRM_KEY.
 */

const SEARCH_URL = "https://business.juso.go.kr/addrlink/addrLinkApi.do";
const COORD_URL = "https://business.juso.go.kr/addrlink/addrCoordApi.do";

export interface JusoRecord {
  roadAddr: string;
  jibunAddr: string;
  bdNm: string; // 건물명 (아파트 이름이 들어오기도 한다)
  admCd: string; // 행정구역코드 10자리
  rnMgtSn: string; // 도로명코드 12자리
  udrtYn: string; // 지하 여부 0/1
  buldMnnm: string; // 건물 본번
  buldSlno: string; // 건물 부번
  siNm: string;
  sggNm: string;
  emdNm: string;
}

interface JusoEnvelope<T> {
  results: { common: { errorCode: string; errorMessage: string; totalCount?: string }; juso: T[] | null };
}

const key = () => {
  const k = process.env.JUSO_CONFIRM_KEY?.trim();
  if (!k) throw new Error(".env 에 JUSO_CONFIRM_KEY 가 비어 있어요.");
  return k;
};

async function call<T>(url: string, params: Record<string, string>, label: string): Promise<T[]> {
  const qs = new URLSearchParams({ ...params, confmKey: key(), resultType: "json" });
  const r = await fetch(`${url}?${qs}`);
  if (r.status === 429 || r.status >= 500) throw new Error(`${label} HTTP ${r.status}`);
  const body = (await r.json()) as JusoEnvelope<T>;
  const { errorCode, errorMessage } = body.results.common;
  if (errorCode !== "0") {
    // -999 시스템 오류 · E0007 호출 제한(짧은 시간 다량 요청)은 잠깐 쉬고 다시 시도한다. 나머지는 입력 문제
    const transient = errorCode === "-999" || errorCode === "E0007";
    const e = new Error(`${label} ${errorCode} ${errorMessage}`) as Error & { permanent?: boolean; transient?: boolean };
    if (transient) e.transient = true; else e.permanent = true;
    throw e;
  }
  return body.results.juso ?? [];
}

/** 호출 제한(E0007) · 일시 오류면 점점 길게 쉬며 다시 부른다 (최대 8번, 2초 → 4초 → … 최대 30초) */
async function callPatient<T>(url: string, params: Record<string, string>, label: string): Promise<T[]> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await call<T>(url, params, label);
    } catch (err) {
      const e = err as Error & { transient?: boolean };
      if (!e.transient || attempt >= 8) throw err;
      await new Promise((r) => setTimeout(r, Math.min(30_000, 2000 * attempt)));
    }
  }
}

/** 키워드로 주소 찾기 (최대 count 건). 검색어에 특수문자 · 너무 짧은 글자는 API 가 거부한다 */
export const searchAddress = (keyword: string, count = 5) => call<JusoRecord>(SEARCH_URL, { keyword, currentPage: "1", countPerPage: String(count) }, `juso 검색 "${keyword}"`);

export interface CoordKey { admCd: string; rnMgtSn: string; udrtYn: string; buldMnnm: string; buldSlno: string }

/** 도로명주소 코드로 건물 출입구 좌표 (UTM-K). 없으면 null. 좌표 API 승인키만 있으면 된다 (검색 API 승인 불필요) */
export async function coordByCodes(k: CoordKey): Promise<{ x: number; y: number } | null> {
  const ask = (udrtYn: string) =>
    callPatient<{ entX: string; entY: string }>(COORD_URL, { admCd: k.admCd, rnMgtSn: k.rnMgtSn, udrtYn, buldMnnm: k.buldMnnm, buldSlno: k.buldSlno }, `juso 좌표 ${k.rnMgtSn} ${k.buldMnnm}-${k.buldSlno}`);
  let rows = await ask(k.udrtYn);
  // 실거래가 원본의 지상 · 지하 코드가 도로명주소 DB 와 어긋나는 단지가 있어, 비었으면 반대 값으로 한 번 더 묻는다
  if (!rows.length) rows = await ask(k.udrtYn === "1" ? "0" : "1");
  // 건물은 있는데 출입구 좌표가 등록되지 않은 경우(entX · entY 빈 값)는 못 찾은 것으로 둔다
  const r = rows.find((x) => x.entX && x.entY);
  return r ? { x: Number(r.entX), y: Number(r.entY) } : null;
}

/** 주소 레코드의 출입구 좌표 (UTM-K). 없으면 null */
export const coordOf = (rec: JusoRecord) => coordByCodes(rec);

/** 키워드 → [위도, 경도]. 검색 결과가 없거나 좌표가 없으면 null */
export async function geocodeJuso(keyword: string): Promise<[number, number] | null> {
  const recs = await searchAddress(keyword, 3);
  for (const rec of recs) {
    const at = await coordOf(rec);
    if (at) return utmkToWgs84(at.x, at.y);
  }
  return null;
}

// ── UTM-K (EPSG:5179, GRS80) → WGS84 ───────────────────────────────
// 횡축 메르카토르 역변환. 원점 위도 38° · 경도 127.5°, 축척 0.9996, 가산 동 1,000,000 · 북 2,000,000.
// GRS80 과 WGS84 타원체 차이는 mm 수준이라 데이텀 변환은 하지 않는다.
const A = 6378137;
const F = 1 / 298.257222101;
const K0 = 0.9996;
const LAT0 = (38 * Math.PI) / 180;
const LON0 = (127.5 * Math.PI) / 180;
const FE = 1_000_000;
const FN = 2_000_000;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);

/** 적도에서 위도 φ 까지의 자오선 호 길이 */
function meridianArc(phi: number): number {
  const e4 = E2 * E2, e6 = e4 * E2;
  return A * ((1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi
    - ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi)
    + ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi)
    - ((35 * e6) / 3072) * Math.sin(6 * phi));
}

export function utmkToWgs84(x: number, y: number): [number, number] {
  const M = meridianArc(LAT0) + (y - FN) / K0;
  const mu = M / (A * (1 - E2 / 4 - (3 * E2 * E2) / 64 - (5 * E2 ** 3) / 256));
  const e1 = (1 - Math.sqrt(1 - E2)) / (1 + Math.sqrt(1 - E2));
  const phi1 = mu + ((3 * e1) / 2 - (27 * e1 ** 3) / 32) * Math.sin(2 * mu)
    + ((21 * e1 ** 2) / 16 - (55 * e1 ** 4) / 32) * Math.sin(4 * mu)
    + ((151 * e1 ** 3) / 96) * Math.sin(6 * mu)
    + ((1097 * e1 ** 4) / 512) * Math.sin(8 * mu);
  const sin1 = Math.sin(phi1), cos1 = Math.cos(phi1), tan1 = Math.tan(phi1);
  const N1 = A / Math.sqrt(1 - E2 * sin1 * sin1);
  const T1 = tan1 * tan1;
  const C1 = EP2 * cos1 * cos1;
  const R1 = (A * (1 - E2)) / Math.pow(1 - E2 * sin1 * sin1, 1.5);
  const D = (x - FE) / (N1 * K0);
  const lat = phi1 - ((N1 * tan1) / R1) * (D * D / 2
    - ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * EP2) * D ** 4) / 24
    + ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * EP2 - 3 * C1 * C1) * D ** 6) / 720);
  const lon = LON0 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6
    + ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * EP2 + 24 * T1 * T1) * D ** 5) / 120) / cos1;
  return [(lat * 180) / Math.PI, (lon * 180) / Math.PI];
}

/** 두 좌표 사이 직선거리(m) */
export function distanceM(a: [number, number], b: [number, number]): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
