import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { loadNaverMaps, type NaverMaps } from "@/lib/naverMaps";
import { openPanorama } from "@/lib/panorama";

/**
 * 위치 한 곳을 보여 주는 작은 지도. 오른쪽 위에 전체 화면 단추, 오른쪽 아래에 확대 · 축소 단추.
 * onStreetView 를 주면 왼쪽 위에 작은 거리뷰를 띄우고, 누르면 onStreetView 를 부른다 (큰 거리뷰 화면은 부른 쪽이 연다).
 * 근처에 거리뷰 사진이 없으면 작은 거리뷰를 숨긴다. 지도를 못 불러오면 주소만 남긴다.
 */
export function MiniMap({ lat, lng, label, className = "h-[260px]", onStreetView }: { lat: number; lng: number; label: string; className?: string; onStreetView?: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const mapBox = useRef<HTMLDivElement>(null);
  const thumbBox = useRef<HTMLDivElement>(null);
  const maps = useRef<NaverMaps>(null);
  const mapObj = useRef<NaverMaps>(null);
  const [failed, setFailed] = useState(false);
  const [hasStreet, setHasStreet] = useState(true);
  const [full, setFull] = useState(false);
  const wantsStreet = Boolean(onStreetView);

  useEffect(() => {
    let thumb: { destroy?: () => void } | null = null;
    let alive = true;
    setHasStreet(true);
    loadNaverMaps()
      .then((m) => {
        if (!alive || !mapBox.current) return;
        maps.current = m;
        const at = new m.LatLng(lat, lng);
        // 확대 · 축소는 직접 그린 단추(오른쪽 아래). 네이버 로고는 단추에 가리지 않게 왼쪽 아래로
        mapObj.current = new m.Map(mapBox.current, {
          center: at,
          zoom: 16,
          scaleControl: false,
          mapDataControl: false,
          zoomControl: false,
          logoControlOptions: { position: m.Position.BOTTOM_LEFT },
        });
        new m.Marker({ map: mapObj.current, position: at, title: label });
        if (wantsStreet && m.Panorama && thumbBox.current) {
          thumb = openPanorama(m, thumbBox.current, { lat, lng }, { zoomControl: false, aroundControl: false, logoControl: false }, () => alive && setHasStreet(false));
        } else setHasStreet(false);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      thumb?.destroy?.();
      mapObj.current?.destroy();
      mapObj.current = null;
    };
  }, [lat, lng, label, wantsStreet]);

  // 전체 화면 단추 모양 (Esc 로 나와도 맞춘다) · 상자 크기가 바뀌면 지도에 새 크기를 알려 준다
  useEffect(() => {
    const sync = () => setFull(document.fullscreenElement === frame.current);
    document.addEventListener("fullscreenchange", sync);
    const observer = new ResizeObserver(() => {
      const m = maps.current;
      if (m && mapBox.current) mapObj.current?.setSize?.(new m.Size(mapBox.current.clientWidth, mapBox.current.clientHeight));
    });
    if (frame.current) observer.observe(frame.current);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      observer.disconnect();
    };
  }, [failed]);

  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : frame.current?.requestFullscreen());
  const zoomBy = (d: number) => mapObj.current?.setZoom(mapObj.current.getZoom() + d, true);
  const control = "flex h-10 w-10 items-center justify-center bg-surface hover:bg-band";

  if (failed)
    return <div className={`flex items-center justify-center rounded-xl border border-line bg-band px-4 text-center text-muted ${className}`}>지도를 불러오지 못했어요. {label}</div>;

  return (
    <div ref={frame} className={`relative overflow-hidden rounded-xl border border-line bg-band ${className}`}>
      {/* isolate: 네이버 지도 안쪽의 z-index 가 이 상자 밖(단추들) 위로 올라오지 않게 */}
      <div ref={mapBox} className="isolate h-full w-full" role="img" aria-label={`${label} 위치 지도`} />

      {onStreetView && (
        <button
          type="button"
          onClick={onStreetView}
          aria-label="거리뷰 보기"
          className={`absolute left-3 top-3 z-10 h-[96px] w-[156px] overflow-hidden rounded-lg border-[3px] border-white shadow-md ${hasStreet ? "" : "hidden"}`}
        >
          <div ref={thumbBox} className="pointer-events-none h-full w-full" aria-hidden="true" />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pb-1.5 pt-5 text-center text-[14px] font-bold text-white">거리뷰</span>
        </button>
      )}

      <button type="button" onClick={toggleFull} aria-label={full ? "전체 화면 끝내기" : "지도 전체 화면으로 보기"} className={`${control} absolute right-3 top-3 z-10 rounded-lg border border-line shadow-md`}>
        {full ? <Minimize2 className="h-5 w-5" aria-hidden="true" /> : <Maximize2 className="h-5 w-5" aria-hidden="true" />}
      </button>
      <div className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-lg border border-line shadow-md">
        <button type="button" onClick={() => zoomBy(1)} aria-label="지도 확대" className={control}>
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="h-px bg-line" aria-hidden="true" />
        <button type="button" onClick={() => zoomBy(-1)} aria-label="지도 축소" className={control}>
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
