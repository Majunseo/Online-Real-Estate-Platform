import { Link, useLocation, useSearchParams } from "react-router-dom";
import { DOCS, NOTICES } from "@/content/docs";
import { formatDate } from "@/lib/format";
import { Page } from "@/components/page/Page";
import { NotFoundPage } from "@/pages/PlaceholderPage";

/** 글로 된 화면 하나. 주소로 src/content/docs.ts 의 내용을 찾는다 */
export function DocPage() {
  const { pathname } = useLocation();
  const doc = DOCS[pathname];
  if (!doc) return <NotFoundPage />;
  return (
    <Page title={doc.title} description={doc.description} width="max-w-[820px]">
      <p className="text-[14px] text-muted">최종 수정 {formatDate(doc.updated)}</p>
      <div className="mt-6 space-y-8">
        {doc.sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-[21px] font-bold">{s.heading}</h2>
            {s.body?.map((p) => (
              <p key={p} className="mt-2 text-[17px] leading-relaxed">
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="mt-2 list-disc space-y-1 pl-6 text-[17px] leading-relaxed">
                {s.list.map((li) => (
                  <li key={li}>{li}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </Page>
  );
}

/** 공지사항: 목록, ?id= 로 하나를 펼친다 */
export function NoticePage() {
  const [params] = useSearchParams();
  const open = params.get("id");
  return (
    <Page title="공지사항" description="집터의 새 기능과 자료 갱신 소식이에요." width="max-w-[820px]">
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {NOTICES.map((n) => (
          <li key={n.id}>
            <Link to={open === n.id ? "/notice" : `/notice?id=${n.id}`} aria-expanded={open === n.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-band">
              <span className="text-[17px] font-bold">{n.title}</span>
              <span className="shrink-0 text-[14px] text-muted">{formatDate(n.date)}</span>
            </Link>
            {open === n.id && <p className="px-5 pb-5 text-[16px] leading-relaxed">{n.body}</p>}
          </li>
        ))}
      </ul>
    </Page>
  );
}
