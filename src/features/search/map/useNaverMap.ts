import { useEffect, useRef, useState, type RefObject } from "react";
import { loadNaverMaps, type NaverMaps } from "@/lib/naverMaps";
import { KOREA_VIEW } from "./sidoStyle";

export type MapStatus = "loading" | "ready" | "error";

/** 상자 하나에 네이버 지도를 띄운다. 키가 없거나 인증이 실패하면 status 가 error. zoom 은 지금 확대 단계 */
export function useNaverMap(container: RefObject<HTMLDivElement>) {
  const [status, setStatus] = useState<MapStatus>("loading");
  const [zoom, setZoom] = useState(KOREA_VIEW.zoom);
  const maps = useRef<NaverMaps>(null);
  const map = useRef<NaverMaps>(null);

  useEffect(() => {
    let alive = true;
    window.navermap_authFailure = () => alive && setStatus("error");
    loadNaverMaps()
      .then((m) => {
        if (!alive || !container.current) return;
        maps.current = m;
        map.current = new m.Map(container.current, {
          center: new m.LatLng(KOREA_VIEW.lat, KOREA_VIEW.lng),
          zoom: KOREA_VIEW.zoom,
          minZoom: 6,
          zoomControl: false, // 오른쪽 아래 +/- 는 직접 그린다
          mapDataControl: false,
          scaleControl: false,
          logoControlOptions: { position: m.Position.BOTTOM_LEFT },
        });
        m.Event.addListener(map.current, "zoom_changed", (z: number) => alive && setZoom(z));
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
      map.current?.destroy();
      map.current = null;
    };
  }, [container]);

  const zoomBy = (delta: number) => map.current?.setZoom(map.current.getZoom() + delta, true);

  return { status, maps, map, zoomBy, zoom };
}
