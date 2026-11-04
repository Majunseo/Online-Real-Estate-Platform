/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 네이버 지도 Dynamic Map 클라이언트 ID (.env) */
  readonly VITE_NAVER_MAP_CLIENT_ID?: string;
}

interface Window {
  /** 네이버 지도 v3 스크립트가 붙이는 전역. 타입 패키지를 따로 두지 않아 any 로 둔다. */
  naver?: { maps: any };
  /** 키 인증이 실패하면 네이버 지도 스크립트가 부른다 */
  navermap_authFailure?: () => void;
}
