import { useEffect, useRef, useState, type MutableRefObject } from "react";
import type { NaverMaps } from "@/lib/naverMaps";
import { areaStyle, type AreaState, type Layer } from "./sidoStyle";

type Ring = [number, number][];
interface GeoFile {
  features: { properties: { code: string; name: string }; geometry: { coordinates: Ring[][] } }[];
}

interface Shape {
  name: string;
  polygons: NaverMaps[];
  bounds: NaverMaps;
}

export interface BoundaryLayer {
  /** 경계 파일을 다 그렸는지 */
  loaded: boolean;
  boundsOf: (code: string) => NaverMaps | undefined;
}

interface Options {
  ready: boolean;
  maps: MutableRefObject<NaverMaps>;
  map: MutableRefObject<NaverMaps>;
  layer: Layer;
  /** 경계 파일 주소 (public/geo/...). null 이면 이 층을 그리지 않는다 */
  url: string | null;
  /** 이 층의 코드 → 상태. 없는 코드는 idle */
  stateOf: (code: string) => AreaState;
  onSelect: (code: string) => void;
}

/**
 * 경계 파일 하나를 지도에 다각형으로 그리는 층. 시도 · 시군구 · 동 세 층이 같은 훅을 쓴다.
 * 누르면 onSelect(code). 모양은 stateOf 가 정하고, stateOf 가 바뀔 때마다 다시 칠한다.
 */
export function useBoundaryLayer({ ready, maps, map, layer, url, stateOf, onSelect }: Options): BoundaryLayer {
  const shapes = useRef(new Map<string, Shape>());
  const hovered = useRef<string | null>(null);
  const stateRef = useRef(stateOf);
  const onSelectRef = useRef(onSelect);
  stateRef.current = stateOf;
  onSelectRef.current = onSelect;
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  const paint = (code: string) => {
    const base = stateRef.current(code);
    const state = hovered.current === code && (base === "idle" || base === "empty") ? "hover" : base;
    shapes.current.get(code)?.polygons.forEach((p) => p.setOptions(areaStyle(layer, state)));
  };

  // 1) 파일을 받아 그린다 (url 이 바뀌면 지우고 새로)
  useEffect(() => {
    if (!ready || !url) return;
    const m = maps.current;
    let alive = true;
    const listeners: NaverMaps[] = [];
    fetch(url)
      .then((r) => (r.ok ? (r.json() as Promise<GeoFile>) : { features: [] }))
      .then((geo) => {
        if (!alive) return;
        for (const f of geo.features) {
          const { code, name } = f.properties;
          let [minX, minY, maxX, maxY] = [180, 90, -180, -90];
          const polygons = f.geometry.coordinates.map((rings) => {
            for (const [x, y] of rings[0]) {
              minX = Math.min(minX, x);
              maxX = Math.max(maxX, x);
              minY = Math.min(minY, y);
              maxY = Math.max(maxY, y);
            }
            const poly = new m.Polygon({
              map: map.current,
              paths: rings.map((ring) => ring.map(([x, y]) => new m.LatLng(y, x))),
              clickable: true,
              ...areaStyle(layer, stateRef.current(code)),
            });
            listeners.push(
              m.Event.addListener(poly, "click", () => onSelectRef.current(code)),
              m.Event.addListener(poly, "mouseover", () => {
                hovered.current = code;
                paint(code);
              }),
              m.Event.addListener(poly, "mouseout", () => {
                if (hovered.current === code) hovered.current = null;
                paint(code);
              }),
            );
            return poly;
          });
          shapes.current.set(code, { name, polygons, bounds: new m.LatLngBounds(new m.LatLng(minY, minX), new m.LatLng(maxY, maxX)) });
        }
        setLoadedUrl(url);
      });
    return () => {
      alive = false;
      m.Event.removeListener(listeners);
      shapes.current.forEach((s) => s.polygons.forEach((p) => p.setMap(null)));
      shapes.current.clear();
      hovered.current = null;
      setLoadedUrl(null);
    };
    // maps · map 은 ref 라 의존성에 넣지 않는다
  }, [ready, url, layer]);

  // 2) 상태가 바뀌면 다시 칠한다
  useEffect(() => {
    shapes.current.forEach((_, code) => paint(code));
  });

  return { loaded: loadedUrl !== null && loadedUrl === url, boundsOf: (code) => shapes.current.get(code)?.bounds };
}
