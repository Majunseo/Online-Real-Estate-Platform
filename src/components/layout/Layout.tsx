import { Outlet } from "react-router-dom";
import { clsx } from "clsx";
import { SideRail } from "./SideRail";
import { SiteFooter } from "./SiteFooter";
import { TopNav } from "./TopNav";

/**
 * 머리글은 맨 위 한 줄, 그 아래에 왼쪽 아이콘 줄과 본문이 나란히 놓인다.
 * fill: 지도 화면처럼 본문이 남은 화면 높이를 꽉 채우고 스스로 스크롤한다 (바닥글 없음).
 */
export function Layout({ fill = false }: { fill?: boolean }) {
  return (
    <div className={clsx(fill ? "flex h-screen flex-col overflow-hidden" : "min-h-screen")}>
      <TopNav />
      <div className={clsx("flex", fill && "min-h-0 flex-1")}>
        <SideRail />
        <main className="min-w-0 flex-1">
          <Outlet />
          {!fill && <SiteFooter />}
        </main>
      </div>
    </div>
  );
}
