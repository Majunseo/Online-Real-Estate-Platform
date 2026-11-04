/** 지도 위 경계 모양. 색은 여기서만 정한다. */

/** styles/index.css 의 --boundary 와 같은 색 (지도 도형은 CSS 변수를 못 읽는다) */
const SELECTED_BLUE = "#1d4ed8";
const LINE = "#56606e";
const INNER_LINE = "#3f4753"; // 시군구 · 동 경계는 지도 도로와 구분되게 조금 진하게
const INK = "#111418";
const FILL = "#0d7c66";
const NO_DATA = "#9aa1ab";

export const KOREA_VIEW = { lat: 36.2, lng: 127.9, zoom: 7 };

/**
 * 경계 하나가 놓일 수 있는 상태
 *   idle      아무것도 아님
 *   hover     마우스를 올림
 *   selected  지금 고른 가장 아래 단계 (파란 얇은 테두리)
 *   ancestor  고른 곳을 품은 위 단계 (예: 동을 골랐을 때의 구)
 *   empty     아직 실거래가를 받지 않은 지역 (회색)
 */
export type AreaState = "idle" | "hover" | "selected" | "ancestor" | "empty";

/** 층마다 겹치는 순서: 시도 < 시군구 < 동. 아래 단계가 위에 깔려야 안쪽을 누를 수 있다 */
export type Layer = "sido" | "sgg" | "dong";
const Z: Record<Layer, number> = { sido: 1, sgg: 10, dong: 20 };

export function areaStyle(layer: Layer, state: AreaState) {
  const z = Z[layer];
  switch (state) {
    case "selected":
      return { strokeColor: SELECTED_BLUE, strokeOpacity: 1, strokeWeight: 2, fillColor: SELECTED_BLUE, fillOpacity: 0.03, zIndex: z + 3 };
    case "ancestor":
      return { strokeColor: INK, strokeOpacity: 0.55, strokeWeight: 1.5, fillColor: FILL, fillOpacity: 0, zIndex: z + 2 };
    case "hover":
      return { strokeColor: LINE, strokeOpacity: 0.9, strokeWeight: 1, fillColor: FILL, fillOpacity: 0.16, zIndex: z + 1 };
    case "empty":
      return { strokeColor: LINE, strokeOpacity: 0.6, strokeWeight: 1, fillColor: NO_DATA, fillOpacity: 0.3, zIndex: z };
    default:
      return layer === "sido"
        ? { strokeColor: LINE, strokeOpacity: 0.45, strokeWeight: 1, fillColor: FILL, fillOpacity: 0.04, zIndex: z }
        : { strokeColor: INNER_LINE, strokeOpacity: 0.85, strokeWeight: 1.5, fillColor: FILL, fillOpacity: 0.04, zIndex: z };
  }
}
