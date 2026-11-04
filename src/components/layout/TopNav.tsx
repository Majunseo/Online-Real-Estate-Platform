import { Link, NavLink, useLocation } from "react-router-dom";
import { NAV_LEFT, NAV_RIGHT, type NavItem } from "@/config/site";
import { useAuth } from "@/features/auth/AuthProvider";
import { Logo } from "./Logo";

function NavLinks({ items }: { items: NavItem[] }) {
  return (
    <ul className="hidden items-center gap-10 lg:flex">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink to={item.to} className="text-[19px] text-ink hover:text-brand">
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

/** 로그인 단추, 또는 로그인한 회원 이름(누르면 내 계정)과 로그아웃. 확인하는 동안은 자리만 잡아 둔다 */
function Account() {
  const { user, logout } = useAuth();
  const { pathname, search } = useLocation();
  if (user === undefined) return <span className="h-[38px] w-[86px]" aria-hidden="true" />;
  if (!user)
    return (
      <Link to={`/login?${new URLSearchParams({ next: pathname + search })}`} className="btn-primary h-[38px] px-5 text-[16px]">
        로그인
      </Link>
    );
  return (
    <div className="flex items-center gap-3">
      <Link to="/account" className="max-w-[8rem] truncate text-[16px] font-bold hover:text-brand hover:underline" title={`${user.email} · 내 계정`}>
        {user.name}님
      </Link>
      <button type="button" onClick={logout} className="btn-outline h-[38px] px-4 py-0 text-[15px]">
        로그아웃
      </button>
    </div>
  );
}

/** 맨 위 머리글. 왼쪽 메뉴 · 가운데 로고 · 오른쪽 메뉴와 로그인. 스크롤하면 함께 올라간다. */
export function TopNav() {
  return (
    <header className="relative border-b border-line bg-surface">
      <nav aria-label="주 메뉴" className="mx-auto flex h-[76px] max-w-page items-center justify-between px-6 lg:px-28">
        <NavLinks items={NAV_LEFT} />
        <div className="lg:absolute lg:left-1/2 lg:-translate-x-1/2">
          <Logo />
        </div>
        <div className="flex items-center gap-10">
          <NavLinks items={NAV_RIGHT} />
          <Account />
        </div>
      </nav>
    </header>
  );
}
