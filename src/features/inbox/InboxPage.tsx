import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Inbox, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { Message } from "@shared/types";
import { getJson, sendJson } from "@/lib/api";
import { Notice, Page, RequireLogin } from "@/components/page/Page";
import { useInboxCount } from "./InboxCount";

const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * 메시지함: 집터가 보낸 안내(가입 · 매물 등록 · 문의 접수)를 모아 둔다.
 * 왼쪽 목록에서 고르면 오른쪽에 본문이 열리고 읽음으로 바뀐다. 고른 메시지는 주소(?id=)에 남는다.
 */
export function InboxPage() {
  return (
    <Page title="메시지" description="집터와 고객센터에서 보낸 메시지예요." width="max-w-[1100px]">
      <RequireLogin what="메시지">
        <Mailbox />
      </RequireLogin>
    </Page>
  );
}

function Mailbox() {
  const [params, setParams] = useSearchParams();
  const openId = Number(params.get("id")) || null;
  const [items, setItems] = useState<Message[] | null>(null);
  const [open, setOpen] = useState<Message | null>(null);
  const { setUnread } = useInboxCount();

  useEffect(() => {
    getJson<{ items: Message[]; unread: number }>("/api/inbox").then((r) => {
      setItems(r.items);
      setUnread(r.unread);
    });
  }, [setUnread]);

  useEffect(() => {
    if (!openId) return setOpen(null);
    getJson<{ message: Message; unread: number }>(`/api/inbox/${openId}`)
      .then((r) => {
        setOpen(r.message);
        setUnread(r.unread);
        setItems((prev) => prev?.map((m) => (m.id === r.message.id ? r.message : m)) ?? prev);
      })
      .catch(() => setOpen(null));
  }, [openId, setUnread]);

  const remove = async (id: number) => {
    const r = await sendJson<{ unread: number }>("DELETE", `/api/inbox/${id}`);
    setUnread(r.unread);
    setItems((prev) => prev?.filter((m) => m.id !== id) ?? prev);
    setParams({});
  };

  if (!items) return <p className="py-16 text-center text-muted">불러오는 중…</p>;
  if (!items.length) return <Notice icon={Inbox} title="메시지가 없어요" />;

  return (
    <div className="grid gap-4 md:grid-cols-[360px_1fr]">
      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line" aria-label="메시지 목록">
        {items.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => setParams({ id: String(m.id) })}
              aria-current={m.id === openId ? "true" : undefined}
              className={clsx("block w-full px-4 py-3 text-left hover:bg-band", m.id === openId && "bg-brand-soft")}
            >
              <span className="flex items-center gap-2">
                {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-tag" aria-label="안 읽음" />}
                <span className={clsx("truncate text-[16px]", !m.read && "font-extrabold")}>{m.subject}</span>
              </span>
              <span className="mt-0.5 block text-[14px] text-muted">
                {m.sender} · {when(m.createdAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <article className="min-h-[260px] rounded-2xl border border-line p-6" aria-live="polite">
        {open ? (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[22px] font-bold">{open.subject}</h2>
                <p className="mt-1 text-[15px] text-muted">
                  {open.sender} · {when(open.createdAt)}
                </p>
              </div>
              <button type="button" onClick={() => remove(open.id)} className="btn-outline h-10 px-3 py-0 text-[15px]">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                지우기
              </button>
            </div>
            <p className="mt-5 whitespace-pre-line text-[17px] leading-relaxed">{open.body}</p>
          </>
        ) : (
          <p className="flex h-full items-center justify-center text-muted">왼쪽에서 메시지를 골라 주세요.</p>
        )}
      </article>
    </div>
  );
}
