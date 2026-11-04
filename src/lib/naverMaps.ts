/** 네이버 지도 v3 스크립트를 한 번만 불러온다. 키는 .env 의 VITE_NAVER_MAP_CLIENT_ID. */

export type NaverMaps = any;

const SCRIPT = "https://oapi.map.naver.com/openapi/v3/maps.js";
let loading: Promise<NaverMaps> | null = null;

export function loadNaverMaps(): Promise<NaverMaps> {
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  const key = import.meta.env.VITE_NAVER_MAP_CLIENT_ID;
  if (!key) return Promise.reject(new Error("VITE_NAVER_MAP_CLIENT_ID 가 비어 있어요."));
  loading ??= new Promise<NaverMaps>((resolve, reject) => {
    const script = document.createElement("script");
    // panorama: 단지 상세의 거리뷰
    script.src = `${SCRIPT}?ncpKeyId=${encodeURIComponent(key)}&submodules=panorama`;
    script.async = true;
    script.onload = () => {
      const m = window.naver?.maps;
      if (!m) return reject(new Error("지도 스크립트가 비어 있어요."));
      // 거리뷰 같은 추가 모듈은 본 스크립트 뒤에 따로 받아진다. 다 받아진 뒤에 넘긴다
      if (m.jsContentLoaded) resolve(m);
      else m.onJSContentLoaded = () => resolve(m);
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("지도 스크립트를 받지 못했어요."));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * 지도 객체를 정리(리스너 떼기 · 지우기 · destroy)할 때 쓴다.
 * 키 인증이 실패하면 네이버 지도 스크립트 안쪽이 망가져 정리 함수가 오류를 던진다. 그 오류가 화면(React)까지 올라가면
 * 페이지 전체가 하얗게 꺼지므로, 정리 중 오류는 경고만 남기고 넘어간다.
 */
export function quietly(run: () => void): void {
  try {
    run();
  } catch (err) {
    console.warn("[지도] 정리하다 오류가 나서 건너뛰었어요 (지도 인증 실패 등)", err);
  }
}
