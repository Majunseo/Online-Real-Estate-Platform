import type { ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";
import { FIELD_H } from "./Field";

/** 이름표 · 칸 · 오류 문장 묶음. Field(한 줄 입력)와 같은 모양으로 고르기 · 여러 줄 입력을 만든다 */

interface Wrap {
  id: string;
  label: string;
  required?: boolean;
  error?: string | null;
  hint?: string;
  className?: string;
  children: ReactNode;
}

export function Labeled({ id, label, required, error, hint, className, children }: Wrap) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[16px] font-bold">
        {label}
        {required && (
          <span className="ml-1 text-tag" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[15px] text-tag">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-[14px] text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const box = (error?: string | null) =>
  clsx("w-full rounded-xl border-[1.5px] bg-surface px-4 text-[17px] focus:outline-none", error ? "border-tag focus:border-tag" : "border-muted/60 focus:border-brand");

const describe = (id: string, error?: string | null, hint?: string) => (error ? `${id}-error` : hint ? `${id}-hint` : undefined);

type SelectProps = Omit<Wrap, "children"> & SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] };

export function SelectField({ id, label, required, error, hint, className, options, ...rest }: SelectProps) {
  return (
    <Labeled id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <select id={id} required={required} aria-invalid={error ? true : undefined} aria-describedby={describe(id, error, hint)} className={clsx(box(error), FIELD_H)} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Labeled>
  );
}

type AreaProps = Omit<Wrap, "children"> & TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextAreaField({ id, label, required, error, hint, className, ...rest }: AreaProps) {
  return (
    <Labeled id={id} label={label} required={required} error={error} hint={hint} className={className}>
      <textarea id={id} required={required} aria-invalid={error ? true : undefined} aria-describedby={describe(id, error, hint)} className={clsx(box(error), "min-h-[120px] py-3")} {...rest} />
    </Labeled>
  );
}
