import { useEffect, type MutableRefObject } from "react";
import type { StationsResult } from "@shared/types";
import { STATION_RADIUS_M } from "@shared/filters";
import { quietly, type NaverMaps } from "@/lib/naverMaps";

type Station = StationsResult["stations"][number];

/** 이만큼 확대해야 역을 찍는다 (그보다 멀면 역이 너무 많아 단지가 가려진다) */
const STATION_ZOOM = 12;
/** 이만큼 확대하면 역 이름까지 보여 준다 (그 전에는 기차 그림만) */
const LABEL_ZOOM = 14;
/** 이만큼 확대하면 역세권 범위(반경 500m) 원을 그린다 */
const CIRCLE_ZOOM = 13;
/** index.css 의 --station 과 같은 색 */
const STATION_COLOR = "rgb(30, 42, 74)";

// lucide 의 train-front 그림 (Marker 내용은 HTML 문자열이라 직접 넣는다)
const TRAIN_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><path d="m9 15-1-1"/><path d="m15 15 1-1"/><path d="M9 19c-2.8 0-5-2.2-5-5v-4a8 8 0 0 1 16 0v4c0 2.8-2.2 5-5 5Z"/><path d="m8 19-2 3"/><path d="m16 19 2 3"/></svg>';

const escape = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * 역세권 조건일 때 지도에 지하철역(조건에 맞는 단지들이 기대는 역)을 찍는다. 단지 핀(둥근 주황 가격표)과 헷갈리지 않게 네모난 남색 이름표에 꼬리를 단다.
 * 역 이름표는 누를 수 없고(단지 핀을 가리지 않게 아래에 깔린다), 마우스를 올리면 노선이 보인다.
 * stations 가 비어 있으면 아무것도 그리지 않는다.
 */
export function useStationMarkers(ready: boolean, maps: MutableRefObject<NaverMaps>, map: MutableRefObject<NaverMaps>, stations: Station[]) {
  useEffect(() => {
    if (!ready || !map.current || stations.length === 0) return;
    const m = maps.current;
    const mp = map.current;
    let shapes: NaverMaps[] = [];

    const draw = () => {
      shapes.forEach((s) => s.setMap(null));
      shapes = [];
      const zoom = mp.getZoom();
      if (zoom < STATION_ZOOM) return;
      const bounds = mp.getBounds();
      const sw = bounds.getSW();
      const ne = bounds.getNE();
      const padLat = (ne.lat() - sw.lat()) * 0.1;
      const padLng = (ne.lng() - sw.lng()) * 0.1;
      for (const [name, lines, lat, lng] of stations) {
        if (lat < sw.lat() - padLat || lat > ne.lat() + padLat || lng < sw.lng() - padLng || lng > ne.lng() + padLng) continue;
        const position = new m.LatLng(lat, lng);
        if (zoom >= CIRCLE_ZOOM) {
          shapes.push(
            new m.Circle({
              map: mp,
              center: position,
              radius: STATION_RADIUS_M,
              strokeColor: STATION_COLOR,
              strokeOpacity: 0.45,
              strokeWeight: 1,
              strokeStyle: "shortdash",
              fillColor: STATION_COLOR,
              fillOpacity: 0.05,
              clickable: false,
            }),
          );
        }
        const label = zoom >= LABEL_ZOOM ? `<span>${escape(name)}역</span>` : "";
        shapes.push(
          new m.Marker({
            map: mp,
            position,
            title: `${name}역 (${lines.join(" · ")})`,
            icon: { content: `<div class="map-station">${TRAIN_SVG}${label}</div>`, anchor: new m.Point(0, 0) },
            clickable: false,
            zIndex: 50, // 단지 핀(100) · 숫자 묶음(200) 아래
          }),
        );
      }
    };

    let frame = 0;
    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    draw();
    const listeners = [m.Event.addListener(mp, "idle", redraw), m.Event.addListener(mp, "zoom_changed", redraw)];
    return () => {
      cancelAnimationFrame(frame);
      quietly(() => m.Event.removeListener(listeners));
      quietly(() => shapes.forEach((s) => s.setMap(null)));
    };
  }, [ready, maps, map, stations]);
}
