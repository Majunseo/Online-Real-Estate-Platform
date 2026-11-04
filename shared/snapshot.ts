import type { Deal } from "./types";

/**
 * 실거래가 스냅숏 파일(server/data/molit/snapshot.json) 형식.
 * scripts/fetch-molit.ts 가 만들고, 서버는 켜질 때 읽기만 한다 (화면이 API 를 직접 부르지 않는다).
 */
export interface SnapshotComplex {
  id: string; // aptSeq (앞부분이 옛 시군구 코드일 수 있다: 전남광주 단지는 29xxx · 46xxx 로 시작)
  sggCode: string; // 받아 올 때 쓴 LAWD_CD (server/data/sgg.ts)
  name: string; // aptNm
  sidoCode: string;
  sido: string;
  sgg: string;
  umd: string; // umdNm
  jibun: string;
  roadAddress: string; // roadNm + roadNmBonbun(-roadNmBubun)
  /** 건축물대장 조회 열쇠: 법정동 코드 뒤 5자리(umdCd) · 본번 · 부번 (4자리, 앞 0 채움). 예전 스냅숏에는 없다 */
  umdCd?: string;
  bun?: string;
  ji?: string;
  buildYear: number;
  lat: number;
  lng: number;
  deals: Deal[]; // 최근 거래부터
}

export interface Snapshot {
  source: string;
  fetchedAt: string; // ISO
  months: string[]; // ["2026-08", ...]
  sgg: { code: string; name: string; sido: string; deals: number }[];
  complexes: SnapshotComplex[];
  /** 좌표를 못 찾아 뺀 단지 수 */
  skipped: number;
}
