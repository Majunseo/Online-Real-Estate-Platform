import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

function Arrow({ dir, disabled, onClick }: { dir: "prev" | "next"; disabled: boolean; onClick: () => void }) {
  const Icon = dir === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "이전 단지" : "다음 단지"}
      className={clsx(
        "flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] transition-colors",
        disabled ? "cursor-default border-line text-line" : "border-ink text-ink hover:bg-band",
      )}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}

/**
 * 가로로 넘기는 카드 줄. 머리(제목 · 설명)와 좌우 화살표를 함께 그린다.
 * 끝에 닿은 화살표는 누를 수 없게 한다.
 */
export function Carousel({ title, subtitle, children, label }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [update, children]);

  const move = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <section aria-label={label}>
      {(title || subtitle) && (
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            {title && <h2 className="section-title">{title}</h2>}
            {subtitle && <p className="section-sub">{subtitle}</p>}
          </div>
          <div className="flex shrink-0 gap-4">
            <Arrow dir="prev" disabled={edge.start} onClick={() => move(-1)} />
            <Arrow dir="next" disabled={edge.end} onClick={() => move(1)} />
          </div>
        </div>
      )}
      <div
        ref={track}
        onScroll={update}
        // scroll-px-2: 카드 맞춤 기준을 안쪽 여백에 맞춰, 처음 위치가 0 으로 남게 한다 (아니면 "이전" 화살표가 처음부터 켜진다)
        className="-mx-2 flex snap-x scroll-px-2 gap-6 overflow-x-auto scroll-smooth px-2 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
    </section>
  );
}
