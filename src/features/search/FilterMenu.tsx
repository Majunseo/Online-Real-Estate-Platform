import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, X, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";

/**
 * 검색 줄의 펼치는 단추 하나. 누르면 단추 바로 아래에 패널이 뜬다.
 * 검색 줄이 가로 스크롤 상자라 패널이 잘리지 않게 화면 기준(fixed)으로 띄운다.
 * 바깥을 누르거나 Esc 를 누르면 닫힌다. active 면 단추를 강조한다(조건이 걸려 있음).
 * 패널은 늘 눌리게 둔다 (지도 위 겹침 층처럼 pointer-events-none 인 곳 안에 놓여도).
 * heading 을 주면 패널 위에 회색 제목 줄과 닫기 단추를 단다. buttonClassName 을 주면 단추 모양을 그것으로 바꾼다(지도 위 단추 등).
 */
export function FilterMenu({
  label,
  active,
  icon: Icon,
  width,
  panelWidth = 320,
  heading,
  buttonClassName,
  children,
}: {
  label: string;
  active: boolean;
  icon?: LucideIcon;
  width: string;
  panelWidth?: number;
  heading?: string;
  buttonClassName?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState({ left: 0, top: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = `menu-${label.replace(/\s+/g, "")}`;

  useLayoutEffect(() => {
    if (!open || !button.current) return;
    const r = button.current.getBoundingClientRect();
    setAt({ left: Math.max(8, Math.min(r.left, window.innerWidth - panelWidth - 8)), top: r.bottom + 6 });
  }, [open, panelWidth]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !panel.current?.contains(e.target as Node) && !button.current?.contains(e.target as Node)) {
        setOpen(false);
        if (e instanceof KeyboardEvent) button.current?.focus();
      }
    };
    const away = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("resize", away);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("resize", away);
    };
  }, [open]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        className={clsx(
          buttonClassName ?? "flex h-[54px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border-[1.5px] px-4 text-[17px] font-bold hover:bg-band",
          width,
          active ? "border-brand bg-brand-soft text-brand-strong" : "border-muted/60 bg-surface text-ink",
        )}
      >
        {Icon && <Icon className="h-5 w-5" aria-hidden="true" />}
        {label}
        <ChevronDown className={clsx("h-5 w-5 transition-transform", open && "rotate-180")} strokeWidth={2.4} aria-hidden="true" />
      </button>
      {open && (
        <div ref={panel} id={id} role="dialog" aria-label={heading ?? label} style={{ left: at.left, top: at.top, width: panelWidth }} className="pointer-events-auto fixed z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          {heading && (
            <div className="flex items-center justify-between bg-band px-4 py-3">
              <h2 className="text-[17px] font-bold">{heading}</h2>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => {
                  setOpen(false);
                  button.current?.focus();
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-line"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}
          <div className="p-4">{children}</div>
        </div>
      )}
    </>
  );
}

/** 패널 안의 고르기 칸 (최소 · 최대 등) */
export function MenuSelect({ id, label, value, options, onChange }: { id: string; label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="block flex-1">
      <span className="text-[14px] font-bold text-muted">{label}</span>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11 w-full rounded-lg border-[1.5px] border-muted/60 px-2 text-[16px] focus:border-brand focus:outline-none">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** 패널 안의 하나 고르기 (둥근 단추 줄) */
export function MenuChoices<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <fieldset>
      <legend className="text-[14px] font-bold text-muted">{label}</legend>
      <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={clsx("rounded-full border-[1.5px] px-3.5 py-1.5 text-[15px] font-bold", o.value === value ? "border-brand bg-brand text-white" : "border-muted/50 hover:bg-band")}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
