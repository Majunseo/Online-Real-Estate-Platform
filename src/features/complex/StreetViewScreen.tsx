import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, ChevronLeft, Link2 } from "lucide-react";
import type { Complex } from "@shared/types";
import { loadNaverMaps, type NaverMaps } from "@/lib/naverMaps";
import { enableClickToMove, openPanorama } from "@/lib/panorama";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";

interface Props {
  complex: Complex;
  /** 위 줄 "단지 정보로": 상세 화면 맨 위로 */
  onBackToListing: () => void;
  /** 거리뷰 안 "지도로 돌아가기": 상세 화면의 위치 지도로 */
  onBackToMap: () => void;
}

/**
 * 거리뷰 화면 (질로우의 Street view 처럼 화면 전체를 쓴다).
 * 위 줄: 단지 정보로 · 단지 이름 · 관심 단지 · 링크 복사 / 그 아래: 창 크기에 맞춘 거리뷰.
 * 열려 있는 동안 뒤 화면은 스크롤되지 않고, Esc 를 누르면 단지 정보로 돌아간다.
 */
export function StreetViewScreen({ complex: c, onBackToListing, onBackToMap }: Props) {
  const layer = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [missing, setMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  // 지금 보이는 거리뷰 사진의 촬영일 ("2025-05-14 12:30:48" → "2025년 5월"). 자리마다 다르다
  const [shotAt, setShotAt] = useState<string | null>(null);

  // 거리뷰 열기 + 창 크기가 바뀌면 크기 알려 주기 (거리뷰는 스스로 맞추지 않는다)
  useEffect(() => {
    let pano: NaverMaps = null;
    let observer: ResizeObserver | null = null;
    let stopClick: (() => void) | null = null;
    let alive = true;
    loadNaverMaps().then((m) => {
      if (!alive || !box.current || !layer.current) return; // 이미 닫혔으면 아무것도 하지 않는다
      if (!m.Panorama) return setMissing(true);
      pano = openPanorama(
        m,
        box.current,
        { lat: c.lat, lng: c.lng },
        { zoomControl: true, zoomControlOptions: { position: m.Position.RIGHT_BOTTOM } },
        () => alive && setMissing(true),
        (loc) => {
          const d = /^(\d{4})-(\d{2})/.exec(loc.photodate ?? "");
          if (alive) setShotAt(d ? `${d[1]}년 ${Number(d[2])}월` : null);
        },
      );
      stopClick = enableClickToMove(m, pano, box.current);
      observer = new ResizeObserver(() => layer.current && pano.setSize(new m.Size(layer.current.clientWidth, layer.current.clientHeight)));
      observer.observe(layer.current);
    });
    return () => {
      alive = false;
      observer?.disconnect();
      stopClick?.();
      pano?.destroy?.();
    };
  }, [c.lat, c.lng]);

  // 뒤 화면 스크롤 막기 · Esc 로 닫기
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onBackToListing();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [onBackToListing]);

  const copyLink = async () => {
    // 거리뷰 주소(?view=street)가 아니라 단지 상세 주소를 복사한다
    await navigator.clipboard?.writeText(`${window.location.origin}/complex/${encodeURIComponent(c.id)}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`${c.name} 거리뷰`} className="fixed inset-0 z-50 flex flex-col bg-surface">
      <header className="flex h-[72px] shrink-0 items-center justify-between gap-3 border-b border-line px-4 sm:px-8">
        <button type="button" onClick={onBackToListing} className="flex items-center gap-1.5 rounded-lg px-2 py-2 text-[17px] hover:bg-band">
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          단지 정보로
        </button>
        <p className="hidden truncate text-[17px] font-bold md:block">{c.name}</p>
        <div className="flex items-center gap-2">
          <FavoriteButton complexId={c.id} name={c.name} variant="inline" />
          <button type="button" onClick={copyLink} className="flex h-11 items-center gap-2 rounded-full border-[1.5px] border-muted/60 px-4 text-[16px] font-bold hover:bg-band" aria-live="polite">
            <Link2 className="h-5 w-5" aria-hidden="true" />
            {copied ? "복사했어요" : "링크 복사"}
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 p-3 sm:p-5">
        <div ref={layer} className="relative isolate h-full w-full overflow-hidden rounded-xl bg-band">
          {/* 거리뷰가 자기 상자의 position · 크기를 바꾸므로, 크기는 바깥(layer)이 정하고 안쪽에 연다 */}
          <div ref={box} className="h-full w-full" role="img" aria-label={`${c.name} 주변 거리뷰`} />
          {missing && <p className="absolute inset-0 flex items-center justify-center text-muted">이 단지 근처에는 거리뷰가 없어요.</p>}
          {!missing && (
            <div className="pointer-events-none absolute inset-x-4 bottom-4 z-10 flex flex-wrap items-center justify-center gap-2 [transform:translateZ(0)]">
              {shotAt && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/75 px-3 py-1 text-[14px] font-bold text-white">
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  {shotAt} 촬영
                </span>
              )}
              <span className="rounded-full bg-ink/75 px-3 py-1 text-[14px] text-white">가고 싶은 곳을 누르면 그쪽으로 이동해요</span>
            </div>
          )}
          <button
            type="button"
            onClick={onBackToMap}
            className="absolute left-4 top-4 z-10 flex h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-4 text-[16px] font-bold shadow-md [transform:translateZ(0)] hover:bg-band"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            지도로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
