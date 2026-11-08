import { useEffect, useState, type FormEvent, type ReactNode } from "react";
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
  const many = pages > 5;
  return (
    <nav aria-label="쪽 넘기기" className="mt-6 flex flex-wrap items-center justify-center gap-3">
      {many && (
        <button type="button" className="btn-outline h-10 px-3 py-0" disabled={page <= 1} onClick={() => onPage(1)} aria-label="첫 쪽">
          «
        </button>
      )}
      <button type="button" className="btn-outline h-10 px-4 py-0" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        이전
      </button>
      <span className="text-[16px]" aria-live="polite">
        {page} / {pages}
      </span>
      <button type="button" className="btn-outline h-10 px-4 py-0" disabled={page >= pages} onClick={() => onPage(page + 1)}>
        다음
      </button>
      {many && (
        <>
          <button type="button" className="btn-outline h-10 px-3 py-0" disabled={page >= pages} onClick={() => onPage(pages)} aria-label="끝 쪽">
            »
          </button>
          <PageJump page={page} pages={pages} onPage={onPage} />
        </>
      )}
    </nav>
  );
}

/** 쪽이 많을 때 번호를 쳐서 바로 가기. 범위 밖 숫자는 가장 가까운 쪽으로 */
function PageJump({ page, pages, onPage }: { page: number; pages: number; onPage: (page: number) => void }) {
  const [text, setText] = useState("");
  useEffect(() => setText(""), [page]);
  const go = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(text);
    if (!Number.isInteger(n) || n < 1) return;
    onPage(Math.min(n, pages));
  };
  return (
    <form onSubmit={go} className="ml-2 flex items-center gap-1.5 text-[15px]">
      <label htmlFor="page-jump" className="text-muted">
        쪽 번호
      </label>
      <input
        id="page-jump"
        type="number"
        inputMode="numeric"
        min={1}
        max={pages}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={String(page)}
        className="h-10 w-[76px] rounded-lg border-[1.5px] border-muted/60 px-2 text-center text-[15px] focus:border-brand focus:outline-none"
      />
      <button type="submit" className="btn-outline h-10 px-3 py-0 text-[15px]">
        이동
      </button>
    </form>
  );
}
