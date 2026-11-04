import { useEffect, useRef, type MutableRefObject } from "react";
import type { PointsResult } from "@shared/types";
import type { NaverMaps } from "@/lib/naverMaps";
import { formatShortPrice } from "@/lib/format";

type Point = PointsResult["points"][number];

/** 화면에서 이 칸(px) 안에 든 단지는 하나의 숫자 묶음으로 합친다 */
const CELL_PX = 64;
/** 이만큼 확대하면 묶지 않고 모두 가격표로 보여 준다 */
const NO_CLUSTER_ZOOM = 17;

interface Cluster {
  points: Point[];
  lat: number;
  lng: number;
}

/** 위경도 → 지금 확대 단계의 세계 픽셀 좌표 (웹 메르카토르, 타일 256px) */
export function toPixel(lat: number, lng: number, zoom: number): [number, number] {
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return [((lng + 180) / 360) * scale, (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale];
}

/** 화면 좌표 격자로 점을 묶는다. 지금 보이는 범위(조금 넉넉히) 밖의 점은 건너뛴다 */
function cluster(map: NaverMaps, points: Point[]): Cluster[] {
  const zoom = map.getZoom();
  const bounds = map.getBounds();
  const sw = bounds.getSW();
  const ne = bounds.getNE();
  const padLat = (ne.lat() - sw.lat()) * 0.2;
  const padLng = (ne.lng() - sw.lng()) * 0.2;
  const loose = zoom >= NO_CLUSTER_ZOOM;
  const cells = new Map<string, Point[]>();
  for (const p of points) {
    const [, lat, lng] = p;
    if (lat < sw.lat() - padLat || lat > ne.lat() + padLat || lng < sw.lng() - padLng || lng > ne.lng() + padLng) continue;
    const [x, y] = toPixel(lat, lng, zoom);
    const key = loose ? p[0] : `${Math.floor(x / CELL_PX)},${Math.floor(y / CELL_PX)}`;
    (cells.get(key) ?? cells.set(key, []).get(key)!).push(p);
  }
  return [...cells.values()].map((group) => ({
    points: group,
    lat: group.reduce((s, p) => s + p[1], 0) / group.length,
    lng: group.reduce((s, p) => s + p[2], 0) / group.length,
  }));
}

/**
 * 단지 점을 지도에 찍는다. 가까운 점은 "12" 처럼 숫자 묶음으로 합치고, 묶음을 누르면 그 묶음이 다 보이게 확대한다.
 * 하나뿐인 칸은 최근 실거래가 표를 보여 주고, 누르면 onOpen(id). 지도를 옮기거나 확대할 때마다 다시 묶는다.
 */
export function useClusteredMarkers(ready: boolean, maps: MutableRefObject<NaverMaps>, map: MutableRefObject<NaverMaps>, points: Point[], onOpen: (id: string) => void) {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  useEffect(() => {
    if (!ready || !map.current) return;
    const m = maps.current;
    const mp = map.current;
    let markers: NaverMaps[] = [];

    const draw = () => {
      markers.forEach((mk) => mk.setMap(null));
      markers = cluster(mp, points).map((c) => {
        const single = c.points.length === 1;
        const [id, , , amount] = c.points[0];
        const marker = new m.Marker({
          map: mp,
          position: new m.LatLng(c.lat, c.lng),
          title: single ? undefined : `단지 ${c.points.length}곳`,
          icon: single
            ? { content: `<div class="map-price">${formatShortPrice(amount)}</div>`, anchor: new m.Point(24, 14) }
            : { content: `<div class="map-cluster">${c.points.length}</div>`, anchor: new m.Point(20, 20) },
          zIndex: single ? 100 : 200,
        });
        m.Event.addListener(marker, "click", () => {
          if (single) return onOpenRef.current(id);
          const lats = c.points.map((p) => p[1]);
          const lngs = c.points.map((p) => p[2]);
          const span = Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
          if (span < 0.0005) mp.morph(marker.getPosition(), Math.max(mp.getZoom() + 2, NO_CLUSTER_ZOOM));
          else mp.fitBounds(new m.LatLngBounds(new m.LatLng(Math.min(...lats), Math.min(...lngs)), new m.LatLng(Math.max(...lats), Math.max(...lngs))), { top: 80, right: 60, bottom: 60, left: 60 });
        });
        return marker;
      });
    };

    // 지역을 고를 때의 fitBounds 는 idle 을 내지 않으므로 zoom_changed 에도 다시 그린다 (한 프레임에 한 번)
    let frame = 0;
    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    draw();
    const listeners = [m.Event.addListener(mp, "idle", redraw), m.Event.addListener(mp, "zoom_changed", redraw)];
    return () => {
      cancelAnimationFrame(frame);
      m.Event.removeListener(listeners);
      markers.forEach((mk) => mk.setMap(null));
    };
  }, [ready, maps, map, points]);
}
