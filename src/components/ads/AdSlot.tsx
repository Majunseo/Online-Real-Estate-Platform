/** 광고가 들어갈 자리. 광고가 정해질 때까지 단색으로 자리만 잡아 둔다. */
export function AdSlot({ className = "" }: { className?: string }) {
  return (
    <aside aria-label="광고" className={`flex items-center justify-center bg-brand-soft ${className}`}>
      <span className="rounded-full border border-brand/30 px-4 py-1.5 text-sm font-semibold text-brand/70">광고 영역</span>
    </aside>
  );
}
