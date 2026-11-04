import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { clsx } from "clsx";
import { computeBudget, DSR_MAX, DSR_TARGET, LTV, validateBudget, type BudgetErrors, type BudgetInput } from "@shared/budget";
import { ApiError } from "@/lib/api";
import { formatManwon } from "@/lib/format";
import { RegionSelect } from "@/components/form/RegionSelect";
import { LogoMark } from "@/components/layout/Logo";
import { SITE } from "@/config/site";

interface Form {
  sido: string;
  sgg: string;
  rate: string;
  income: string;
  cash: string;
  monthlyDebt: string;
  years: string;
}

const toForm = (v: BudgetInput | null): Form => ({
  sido: v?.sido ?? "",
  sgg: v?.sgg ?? "",
  rate: String(v?.rate ?? "4.0"),
  income: v ? String(v.income) : "",
  cash: v ? String(v.cash) : "",
  monthlyDebt: v ? String(v.monthlyDebt) : "",
  years: String(v?.years ?? 30),
});

const toInput = (f: Form): BudgetInput => {
  const n = (s: string) => (s.trim() === "" ? NaN : Number(s.replace(/,/g, "")));
  return { sido: f.sido, sgg: f.sgg || null, rate: n(f.rate), income: n(f.income), cash: n(f.cash), monthlyDebt: n(f.monthlyDebt), years: n(f.years) };
};

/**
 * 내 예산 계산 창 (질로우 BuyAbility 처럼 첫 화면 위에 뜬다).
 * 관심 지역 · 예상 금리 · 연소득 · 보유 현금 · 다른 대출 월 상환액 · 기간을 받아 목표 · 최대 매매가를 계산한다.
 * Esc · 바깥 누르기 · X 로 닫고, 열려 있는 동안 뒤 화면은 스크롤되지 않으며 포커스는 창 안에서만 돈다.
 */
export function BudgetModal({ initial, onClose, onSave, savedToAccount }: { initial: BudgetInput | null; onClose: () => void; onSave: (v: BudgetInput) => Promise<void>; savedToAccount: boolean }) {
  const [f, setF] = useState<Form>(toForm(initial));
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<BudgetErrors>({});
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const set = (k: keyof Form, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setServerErrors({});
  };

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>("select, input")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab" || !dialog.current) return;
      const focusable = [...dialog.current.querySelectorAll<HTMLElement>("button, select, input")].filter((el) => !el.hasAttribute("disabled"));
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = before;
      document.removeEventListener("keydown", onKey);
      opener?.focus();
    };
  }, []); // 열릴 때 한 번만 (입력할 때마다 포커스가 처음 칸으로 돌아가지 않게)

  const input = toInput(f);
  const live = validateBudget(input);
  const preview = Object.keys(live).length === 0 ? computeBudget(input) : null;
  // 한 번 제출한 뒤에는 고치는 대로 안내를 바꾼다 (다 고친 칸에 빨간 글씨가 남지 않게)
  const errors: BudgetErrors = submitted ? { ...live, ...serverErrors } : {};

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setServerErrors({});
    const first = Object.keys(live)[0];
    if (first) return document.getElementById(first === "sido" ? "region-sido" : `budget-${first}`)?.focus();
    setBusy(true);
    try {
      await onSave(input);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.body.field) setServerErrors({ [err.body.field]: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="budget-title" className="flex max-h-[min(92vh,860px)] w-full max-w-[640px] flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <header className="relative flex h-[68px] shrink-0 items-center justify-center border-b border-line">
          <p className="flex items-center gap-1.5 text-[19px] font-extrabold">
            <LogoMark className="h-6 w-6" /> {SITE.loanName}
          </p>
          <button type="button" onClick={onClose} aria-label="닫기" className="absolute right-4 flex h-10 w-10 items-center justify-center rounded-full hover:bg-band">
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </header>

        <form id="budget-form" onSubmit={submit} noValidate className="min-h-0 flex-1 overflow-y-auto px-7 py-6">
          <h2 id="budget-title" className="text-[26px] font-extrabold tracking-tight">
            내 예산으로 살 수 있는 단지 찾기
          </h2>
          <p className="mt-2 text-[17px] text-muted">소득과 보유 현금으로 살 수 있는 가격대를 계산하고, 관심 지역에서 그 가격대 단지를 보여 드려요.</p>
          <p className="mt-2 text-[14px] text-muted">
            <span className="text-tag">*</span> 표시는 꼭 입력해야 해요
          </p>

          <div className="mt-6 space-y-5">
            <div>
              <p className="text-[16px] font-bold">
                관심 지역 <span className="text-tag" aria-hidden="true">*</span>
              </p>
              <div className="mt-1.5">
                <RegionSelect sido={f.sido} sgg={f.sgg} onChange={(s, g) => setF((p) => ({ ...p, sido: s, sgg: g }))} />
              </div>
              {errors.sido && (
                <p role="alert" className="mt-1.5 text-[15px] text-tag">
                  {errors.sido}
                </p>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <MoneyField id="budget-income" label="세전 연소득" unit="만 원/년" value={f.income} onChange={(v) => set("income", v)} error={errors.income} hint="세금 떼기 전 1년 소득" required />
              <MoneyField id="budget-rate" label="예상 금리" unit="%" step="0.1" value={f.rate} onChange={(v) => set("rate", v)} error={errors.rate} hint="모르면 4.0% 그대로" required />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <MoneyField id="budget-cash" label="보유 현금" unit="만 원" value={f.cash} onChange={(v) => set("cash", v)} error={errors.cash} hint="계약금 · 자기자금 (최소 1,000만 원)" required />
              <MoneyField id="budget-monthlyDebt" label="다른 대출 월 상환액" unit="만 원/월" value={f.monthlyDebt} onChange={(v) => set("monthlyDebt", v)} error={errors.monthlyDebt} hint="신용대출 · 카드 할부 등. 없으면 0" required />
            </div>
            <div>
              <label htmlFor="budget-years" className="text-[16px] font-bold">
                대출 기간 <span className="text-tag" aria-hidden="true">*</span>
              </label>
              <select id="budget-years" value={f.years} onChange={(e) => set("years", e.target.value)} className="mt-1.5 h-12 w-full rounded-xl border-[1.5px] border-muted/60 px-3 text-[17px] sm:w-1/2">
                {[10, 20, 30, 40].map((y) => (
                  <option key={y} value={y}>
                    {y}년
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-band px-5 py-4" aria-live="polite">
            {preview ? (
              <p className="text-[16px]">
                목표 <b>{formatManwon(preview.target)}</b> · 최대 <b>{formatManwon(preview.max)}</b> · 월 약 <b>{preview.targetMonthly.toLocaleString("ko-KR")}만 원</b>
              </p>
            ) : (
              <p className="text-[15px] text-muted">다 입력하면 여기에 미리 보여 드려요.</p>
            )}
            <p className="mt-1.5 text-[13px] text-muted">
              목표는 연소득의 {DSR_TARGET * 100}%, 최대는 {DSR_MAX * 100}%(DSR 한도)까지 원리금을 갚는다고 보고, 대출은 매매가의 {LTV * 100}%까지로 계산해요. 실제 한도는 은행 · 지역 규제에 따라 달라요.
            </p>
          </div>
          <p className="mt-3 text-[13px] text-muted">{savedToAccount ? "입력한 값은 내 계정에 저장돼요." : "로그인 전이라 입력한 값은 이 브라우저에만 저장돼요."}</p>
        </form>

        <footer className="shrink-0 border-t border-line px-6 py-4">
          <button type="submit" form="budget-form" disabled={busy} className={clsx("btn-primary h-[56px] w-full text-[19px]", !preview && "bg-brand/40 hover:bg-brand/40")}>
            {busy ? "계산하는 중…" : "내 예산 계산하기"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function MoneyField({ id, label, unit, value, onChange, error, hint, step, required }: { id: string; label: string; unit: string; value: string; onChange: (v: string) => void; error?: string; hint?: string; step?: string; required?: boolean }) {
  const described = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div>
      <label htmlFor={id} className="text-[16px] font-bold">
        {label} {required && <span className="text-tag" aria-hidden="true">*</span>}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min="0"
          step={step ?? "1"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby={described}
          required={required}
          className={clsx("h-12 w-full rounded-xl border-[1.5px] pl-4 pr-20 text-[17px] focus:outline-none", error ? "border-tag" : "border-muted/60 focus:border-brand")}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-muted">{unit}</span>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[14px] text-tag">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-[13px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
