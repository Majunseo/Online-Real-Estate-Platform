import type { ReactNode } from "react";
import { AdSlot } from "@/components/ads/AdSlot";

/**
 * 로그인 · 회원가입 공통 틀. 왼쪽은 입력 칸, 오른쪽은 광고 자리 (좁은 화면에서는 숨김).
 * 화면 높이에 딱 맞춘다: 내용은 세로 가운데, 화면이 아주 낮을 때만 왼쪽 칸 안에서 스크롤된다.
 * (가운데 정렬을 justify-center 가 아니라 my-auto 로 해야 넘칠 때 위쪽이 잘리지 않는다)
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      <main className="flex h-full w-full flex-col overflow-y-auto px-6 py-[clamp(1rem,4vh,4rem)] sm:px-14 lg:w-[34%] lg:min-w-[520px] lg:px-[110px]">
        <div className="my-auto w-full max-w-[444px]">{children}</div>
      </main>
      <AdSlot className="hidden h-full flex-1 lg:flex" />
    </div>
  );
}
