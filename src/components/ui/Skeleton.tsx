import { clsx } from "clsx";

/** 내용이 아직 없을 때 자리를 잡아 두는 회색 막대 */
export function SkeletonBar({ className }: { className?: string }) {
  return <span className={clsx("block h-6 rounded-full bg-band", className)} aria-hidden="true" />;
}

/** 본문 세 줄 자리 */
export function SkeletonLines() {
  return (
    <div className="space-y-3 px-3 py-5" aria-hidden="true">
      <SkeletonBar className="w-2/3" />
      <SkeletonBar className="w-[87%]" />
      <SkeletonBar className="w-3/4" />
    </div>
  );
}
