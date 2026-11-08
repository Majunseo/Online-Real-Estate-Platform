import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { LogOut, Menu, UserRound, X } from "lucide-react";
import { clsx } from "clsx";
import { NAV_LEFT, NAV_RIGHT, RAIL } from "@/config/site";
import { useAuth } from "@/features/auth/AuthProvider";
import { useInboxCount } from "@/features/inbox/InboxCount";
import { Logo } from "./Logo";

/**
 * 좁은 화면의 메뉴 단추(≡)와 오른쪽에서 나오는 서랍.
 * 머리글 메뉴(1024px 미만에서 숨음)와 왼쪽 아이콘 줄(768px 미만에서 숨음)에 있던 길을 한곳에 모은다.
 * 주소가 바뀌거나, Esc · 바깥 · 닫기를 누르면 닫힌다. 열려 있는 동안 뒤 화면은 스크롤되지 않는다.
 */
export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const { pathname, search } = useLocation();
  const { user, logout } = useAuth();
  const { unread } = useInboxCount();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const item = "flex items-center gap-3 rounded-lg px-3 py-3 text-[18px] hover:bg-band";
  const next = new URLSearchParams({ next: pathname + search });

  return (
    <div className="lg:hidden">
      <button type="button" aria-label="메뉴 열기" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-band">
        <Menu className="h-7 w-7" strokeWidth={2.4} aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
          <button type="button" aria-label="메뉴 닫기" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
          <nav id="mobile-menu" aria-label="메뉴" className="relative flex h-full w-[min(320px,85vw)] flex-col overflow-y-auto bg-surface shadow-2xl">
            <div className="flex h-[76px] shrink-0 items-center justify-between border-b border-line px-5">
              <Logo />
              <button type="button" aria-label="메뉴 닫기" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-band">
                <X className="h-7 w-7" strokeWidth={2.4} aria-hidden="true" />
              </button>
            </div>

            <ul className="px-3 pt-3">
              {RAIL.map(({ label, to, icon: Icon }) => (
                <li key={to}>
                  <NavLink to={to} className={({ isActive }) => clsx(item, isActive && "font-bold text-brand")}>
                    <Icon className="h-6 w-6 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                    {label}
                    {to === "/inbox" && unread > 0 && (
                      <span className="ml-auto min-w-[22px] rounded-full bg-tag px-1.5 text-center text-[12px] font-bold leading-[22px] text-white">
                        {unread > 99 ? "99+" : unread}
                        <span className="sr-only">통 안 읽음</span>
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>

            <ul className="mt-3 border-t border-line px-3 pt-3">
              {[...NAV_LEFT, ...NAV_RIGHT].map(({ label, to }) => (
                <li key={to}>
                  <NavLink to={to} className={({ isActive }) => clsx(item, isActive && "font-bold text-brand")}>
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>

            <div className="mt-auto border-t border-line p-5">
              {user ? (
                <>
                  <Link to="/account" className="flex items-center gap-3 text-[17px] font-bold hover:text-brand">
                    <UserRound className="h-6 w-6" aria-hidden="true" />
                    <span className="truncate">{user.name}님 · 내 계정</span>
                  </Link>
                  <button type="button" onClick={logout} className="btn-outline mt-4 flex h-[44px] w-full items-center justify-center gap-2 text-[16px]">
                    <LogOut className="h-5 w-5" aria-hidden="true" /> 로그아웃
                  </button>
                </>
              ) : (
                user === null && (
                  <div className="flex gap-2">
                    <Link to={`/login?${next}`} className="btn-primary h-[44px] flex-1 text-[16px]">
                      로그인
                    </Link>
                    <Link to="/signup" className="btn-outline h-[44px] flex-1 text-[16px]">
                      회원가입
                    </Link>
                  </div>
                )
              )}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
