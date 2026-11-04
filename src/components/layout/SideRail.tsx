import { NavLink } from "react-router-dom";
import { clsx } from "clsx";
import { RAIL } from "@/config/site";
import { useInboxCount } from "@/features/inbox/InboxCount";

/** 화면 왼쪽 세로 아이콘 줄. 머리글 아래에서 시작해, 스크롤해도 화면에 붙어 있다. */
export function SideRail() {
  const { unread } = useInboxCount();
  return (
    <aside className="sticky top-0 hidden h-screen w-[76px] shrink-0 border-r border-line bg-surface md:block">
      <nav aria-label="바로가기">
        <ul className="flex flex-col items-center gap-2 pt-3">
          {RAIL.map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  clsx(
                    "flex w-[70px] flex-col items-center gap-1.5 rounded-lg py-1.5 text-[12px] hover:bg-band",
                    isActive ? "font-bold text-brand" : "text-ink",
                  )
                }
              >
                <span className="relative">
                  <Icon className="h-[26px] w-[26px]" strokeWidth={2.5} aria-hidden="true" />
                  {to === "/inbox" && unread > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 min-w-[18px] rounded-full bg-tag px-1 text-center text-[11px] font-bold leading-[18px] text-white">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
                {label}
                {to === "/inbox" && unread > 0 && <span className="sr-only">안 읽은 메시지 {unread}통</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
