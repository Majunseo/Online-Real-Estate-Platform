import { useState, type FormEvent } from "react";
import { BODY_MAX, HELP_CATEGORIES, validateInquiry, type InquiryErrors, type InquiryInput } from "@shared/forms";
import { ApiError, postJson } from "@/lib/api";
import { Field } from "@/components/form/Field";
import { SelectField, TextAreaField } from "@/components/form/Controls";

/**
 * 문의 양식. 고객센터(kind="help")는 문의 종류를, 광고(kind="advertise")는 회사 · 연락처를 더 받는다.
 * 같은 규칙(shared/forms)으로 화면이 먼저 거르고 서버가 다시 판정한다. 접수되면 접수번호를 보여 준다.
 */
export function InquiryForm({ kind, defaults, onSent }: { kind: InquiryInput["kind"]; defaults?: Partial<InquiryInput>; onSent?: (ticket: string) => void }) {
  const blank: InquiryInput = { kind, name: "", email: "", phone: "", company: "", category: "", subject: "", body: "", ...defaults };
  const [v, setV] = useState<InquiryInput>(blank);
  const [errors, setErrors] = useState<InquiryErrors>({});
  const [busy, setBusy] = useState(false);
  const [ticket, setTicket] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const set = (k: keyof InquiryInput, value: string) => setV((prev) => ({ ...prev, [k]: value }));
  const id = (k: string) => `${kind}-${k}`;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setFailure(null);
    const found = validateInquiry(v);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return document.getElementById(id(first))?.focus();
    setBusy(true);
    try {
      const r = await postJson<{ ticket: string }>("/api/inquiries", v);
      setTicket(r.ticket);
      setV({ ...blank, name: v.name, email: v.email, phone: v.phone, company: v.company });
      onSent?.(r.ticket);
    } catch (err) {
      if (err instanceof ApiError && err.body.field) setErrors({ [err.body.field]: err.message });
      else setFailure(err instanceof ApiError ? err.message : "보내지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-4" aria-label={kind === "help" ? "1:1 문의" : "광고 문의"}>
      {kind === "help" && (
        <SelectField
          id={id("category")}
          label="문의 종류"
          required
          value={v.category}
          onChange={(e) => set("category", e.target.value)}
          error={errors.category}
          options={[{ value: "", label: "골라 주세요" }, ...HELP_CATEGORIES.map((c) => ({ value: c, label: c }))]}
        />
      )}
      {kind === "advertise" && <Field id={id("company")} label="회사 이름" required value={v.company} onChange={(e) => set("company", e.target.value)} error={errors.company} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id("name")} label={kind === "advertise" ? "담당자 이름" : "이름"} required autoComplete="name" value={v.name} onChange={(e) => set("name", e.target.value)} error={errors.name} />
        <Field id={id("email")} label="답변 받을 이메일" type="email" required autoComplete="email" value={v.email} onChange={(e) => set("email", e.target.value)} error={errors.email} />
      </div>
      {kind === "advertise" && <Field id={id("phone")} label="연락처" type="tel" required autoComplete="tel" value={v.phone} onChange={(e) => set("phone", e.target.value)} error={errors.phone} placeholder="02-1234-5678" />}
      <Field id={id("subject")} label="제목" required maxLength={80} value={v.subject} onChange={(e) => set("subject", e.target.value)} error={errors.subject} />
      <TextAreaField
        id={id("body")}
        label="내용"
        required
        maxLength={BODY_MAX}
        value={v.body}
        onChange={(e) => set("body", e.target.value)}
        error={errors.body}
        hint={`${v.body.length} / ${BODY_MAX}자`}
      />
      {ticket && (
        <p role="status" className="rounded-lg bg-brand-soft px-4 py-3 text-brand-strong">
          접수됐어요. 접수번호 <b>{ticket}</b>
          {kind === "help" ? " · 답변은 메시지함으로 보내 드려요." : " · 담당자가 이메일로 연락드릴게요."}
        </p>
      )}
      {failure && (
        <p role="alert" className="rounded-lg bg-tag/10 px-4 py-3 text-tag">
          {failure}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary h-12 w-full">
        {busy ? "보내는 중…" : "문의 보내기"}
      </button>
    </form>
  );
}
