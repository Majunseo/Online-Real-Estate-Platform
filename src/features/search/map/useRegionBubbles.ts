import { useEffect, useRef, type MutableRefObject } from "react";
import type { RegionBubble } from "@shared/types";
import type { NaverMaps } from "@/lib/naverMaps";
import { formatShortPrice } from "@/lib/format";
import { toPixel } from "./useClusteredMarkers";

const escape = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * 묶음 하나가 화면에서 차지하는 대략의 크기(px). 이름이 길면 넓어진다.
 * 시군구 묶음은 두 줄(이름 / 단지 수 · 중간 가격), 동 묶음은 좁은 곳에 많이 모이므로 한 줄(이름 단지 수)로 작게.
 */
const boxOf = (label: string, compact: boolean) => (compact ? { w: Math.max(56, label.length * 14 + 44), h: 30 } : { w: Math.max(84, label.length * 15 + 26), h: 46 });
const GAP = 4;

interface Group {
  head: RegionBubble; // 단지가 가장 많은 지역 (이름 · 자리)
  members: RegionBubble[];
}

/**
 * 지역 묶음 표시: "치평동 / 18곳 · 2.6억" 을 그 지역 단지들의 가운데에 띄운다. 누르면 onSelect(지역 코드).
 * 화면에서 서로 겹치는 지역은 하나로 합쳐 "북구 외 4 / 793곳" 으로 보여 주고, 누르면 그 자리를 두 단계 확대한다
 * (그래도 겹치면 다시 누르면 된다).
 * (단지가 많은 지역부터 자리를 잡는다.) 지도를 확대 · 축소할 때마다 다시 묶는다.
 */
export function useRegionBubbles(
  ready: boolean,
  maps: MutableRefObject<NaverMaps>,
  map: MutableRefObject<NaverMaps>,
  bubbles: RegionBubble[],
  compact: boolean,
  onSelect: (code: string) => void,
) {
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  useEffect(() => {
    if (!ready || !map.current || !bubbles.length) return;
    const m = maps.current;
    const mp = map.current;
    const order = [...bubbles].sort((a, b) => b.count - a.count);
    let markers: NaverMaps[] = [];

    const group = (): Group[] => {
      const zoom = mp.getZoom();
      const groups: (Group & { x: number; y: number; w: number; h: number })[] = [];
      for (const b of order) {
        const [x, y] = toPixel(b.lat, b.lng, zoom);
        const { w, h } = boxOf(b.name, compact);
        const host = groups.find((g) => Math.abs(g.x - x) * 2 < g.w + w + GAP && Math.abs(g.y - y) * 2 < g.h + h + GAP);
        if (host) host.members.push(b);
        else groups.push({ head: b, members: [b], x, y, w, h });
      }
      return groups;
    };

    const draw = () => {
      markers.forEach((mk) => mk.setMap(null));
      markers = group().map(({ head, members }) => {
        const single = members.length === 1;
        const name = single ? head.name : `${head.name} 외 ${members.length - 1}`;
        const total = members.reduce((s, b) => s + b.count, 0);
        const { w, h } = boxOf(name, compact);
        const detail = compact ? String(total) : single ? `${head.count}곳 · ${escape(formatShortPrice(head.median))}` : `${total}곳`;
        const marker = new m.Marker({
          map: mp,
          position: new m.LatLng(head.lat, head.lng),
          title: single ? `${head.name} 단지 ${head.count}곳, 최근 실거래가 중간값 ${formatShortPrice(head.median)}` : `${members.map((b) => b.name).join(", ")} 단지 ${total}곳 (누르면 확대)`,
          icon: {
            content: `<div class="map-region${compact ? " is-compact" : ""}${single ? "" : " is-group"}" style="min-width:${w}px"><b>${escape(name)}</b><span>${detail}</span></div>`,
            anchor: new m.Point(w / 2, h / 2),
          },
          zIndex: 150,
        });
        m.Event.addListener(marker, "click", () => {
          if (single) return onSelectRef.current(head.code);
          const lat = members.reduce((s, b) => s + b.lat, 0) / members.length;
          const lng = members.reduce((s, b) => s + b.lng, 0) / members.length;
          mp.morph(new m.LatLng(lat, lng), mp.getZoom() + 2);
        });
        return marker;
      });
    };

    let frame = 0;
    const redraw = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(draw);
    };
    draw();
    const listeners = [m.Event.addListener(mp, "zoom_changed", redraw)];
    return () => {
      cancelAnimationFrame(frame);
      m.Event.removeListener(listeners);
      markers.forEach((mk) => mk.setMap(null));
    };
  }, [ready, maps, map, bubbles, compact]);
}
