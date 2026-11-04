import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/features/auth/AuthProvider";

/** 일반 화면의 본문 틀: 가운데 정렬 · 좌우 여백 · 제목 줄 */
export function Page({ title, description, actions, width = "max-w-[1100px]", children }: { title: string; description?: ReactNode; actions?: ReactNode; width?: string; children: ReactNode }) {
  return (
    <div className={clsx("mx-auto w-full px-5 py-10 sm:px-8", width)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-extrabold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-[17px] text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}

/** 빈 상태 · 오류 상태 안내 상자 */
export function Notice({ icon: Icon, title, children }: { icon: typeof Lock; title: string; children?: ReactNode }) {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-line bg-band/60 px-6 py-14 text-center">
      <Icon className="h-11 w-11 text-muted" aria-hidden="true" />
      <h2 className="mt-4 text-[21px] font-bold">{title}</h2>
      {children && <div className="mt-2 text-[16px] text-muted">{children}</div>}
    </section>
  );
}

/** 로그인해야 보이는 화면. 로그인 전이면 안내와 로그인 단추를 보여 주고, 마치면 이 화면으로 돌아온다 */
export function RequireLogin({ what, children }: { what: string; children: ReactNode }) {
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  if (user === undefined) return <p className="py-16 text-center text-muted">불러오는 중…</p>;
  if (!user)
    return (
      <Notice icon={Lock} title={`${what}은(는) 로그인하면 볼 수 있어요`}>
        <Link to={`/login?${new URLSearchParams({ next: pathname + search })}`} className="btn-primary mt-4 inline-flex">
          로그인하기
        </Link>
      </Notice>
    );
  return <>{children}</>;
}

/** 앞 · 뒤 쪽 넘기기 */
export function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  if (pages <= 1) return null;
  return (
    <nav aria-label="쪽 넘기기" className="mt-6 flex items-center justify-center gap-3">
      <button type="button" className="btn-outline h-10 px-4 py-0" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        이전
      </button>
      <span className="text-[16px]" aria-live="polite">
        {page} / {pages}
      </span>
      <button type="button" className="btn-outline h-10 px-4 py-0" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        다음
      </button>
    </nav>
  );
}
