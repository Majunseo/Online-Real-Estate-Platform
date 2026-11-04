import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, Inbox } from "lucide-react";
import { clsx } from "clsx";
import { ApiError, getJson } from "@/lib/api";
import { formatDate } from "@/lib/format";

export interface InquiryRecord {
  ticket: string;
  kind: "help" | "advertise";
  category: string;
  company: string;
  subject: string;
  body: string;
  createdAt: string;
  status: string;
}

/** 문의 한 건: 접수번호 · 제목 · 상태, 누르면 내용이 펼쳐진다 */
function InquiryItem({ r, open, onToggle }: { r: InquiryRecord; open: boolean; onToggle: () => void }) {
  return (
    <li className="rounded-xl border border-line">
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-band">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[16px] font-bold">{r.subject}</span>
          <span className="text-[14px] text-muted">
            {r.ticket} · {r.kind === "help" ? r.category : `광고 · ${r.company}`} · {formatDate(r.createdAt.slice(0, 10))}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-band px-2.5 py-0.5 text-[13px] font-bold text-muted">{r.status}</span>
        <ChevronDown className={clsx("h-5 w-5 shrink-0 text-muted transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && <p className="whitespace-pre-line border-t border-line px-4 py-3 text-[15px] leading-relaxed">{r.body}</p>}
    </li>
  );
}

/** 로그인한 회원의 문의 내역. refreshKey 가 바뀌면(새로 접수하면) 다시 받는다 */
export function MyInquiries({ refreshKey, kind }: { refreshKey: unknown; kind?: InquiryRecord["kind"] }) {
  const [items, setItems] = useState<InquiryRecord[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    getJson<{ items: InquiryRecord[] }>("/api/inquiries")
      .then((r) => setItems(kind ? r.items.filter((x) => x.kind === kind) : r.items))
      .catch(() => setItems([]));
  }, [refreshKey, kind]);

  return (
    <section aria-labelledby="my-inquiries" className="mt-8">
      <h3 id="my-inquiries" className="text-[18px] font-bold">
        내 문의 내역 {items ? `${items.length}건` : ""}
      </h3>
      {items && items.length === 0 ? (
        <p className="mt-2 flex items-center gap-2 text-[15px] text-muted">
          <Inbox className="h-4 w-4" aria-hidden="true" />
          아직 남긴 문의가 없어요.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items?.map((r) => (
            <InquiryItem key={r.ticket} r={r} open={open === r.ticket} onToggle={() => setOpen(open === r.ticket ? null : r.ticket)} />
          ))}
        </ul>
      )}
      <p className="mt-2 text-[13px] text-muted">답변이 등록되면 상태가 바뀌고 메시지함으로도 알려 드려요.</p>
    </section>
  );
}

/** 로그인 없이 낸 문의 조회: 접수번호와 문의할 때 적은 이메일 */
export function InquiryLookup() {
  const [ticket, setTicket] = useState("");
  const [email, setEmail] = useState("");
  const [found, setFound] = useState<InquiryRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFound(null);
    setError(null);
    if (!ticket.trim() || !email.trim()) return setError("접수번호와 이메일을 모두 입력해 주세요.");
    try {
      const r = await getJson<{ item: InquiryRecord }>(`/api/inquiries/lookup?${new URLSearchParams({ ticket: ticket.trim(), email: email.trim() })}`);
      setFound(r.item);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "접수번호와 이메일이 맞는 문의가 없어요.");
    }
  };

  return (
    <section aria-labelledby="lookup-title" className="mt-8 rounded-2xl border border-line p-5">
      <h3 id="lookup-title" className="text-[18px] font-bold">
        문의 조회
      </h3>
      <p className="mt-1 text-[14px] text-muted">접수할 때 받은 접수번호와 적은 이메일로 확인할 수 있어요.</p>
      <form onSubmit={submit} noValidate className="mt-3 flex flex-wrap gap-2">
        <label className="sr-only" htmlFor="lookup-ticket">
          접수번호
        </label>
        <input id="lookup-ticket" value={ticket} onChange={(e) => setTicket(e.target.value)} placeholder="접수번호 (예: A-00002)" className="h-11 w-[180px] rounded-lg border-[1.5px] border-muted/60 px-3 text-[15px] focus:border-brand focus:outline-none" />
        <label className="sr-only" htmlFor="lookup-email">
          이메일
        </label>
        <input id="lookup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="이메일" className="h-11 min-w-0 flex-1 rounded-lg border-[1.5px] border-muted/60 px-3 text-[15px] focus:border-brand focus:outline-none" />
        <button type="submit" className="btn-outline h-11 px-4 py-0 text-[15px]">
          조회
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-2 text-[14px] text-tag">
          {error}
        </p>
      )}
      {found && (
        <ul className="mt-3">
          <InquiryItem r={found} open onToggle={() => {}} />
        </ul>
      )}
    </section>
  );
}
