import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { clsx } from "clsx";

/** 로그인 · 회원가입 칸 높이. 화면 높이를 따라 줄고 늘어 한 화면에 들어온다 */
export const FIELD_H = "h-[clamp(44px,6.2vh,58px)]";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  /** 칸 아래 빨간 안내. 있으면 aria-invalid 로 표시하고 화면 낭독기가 읽게 연결한다 */
  error?: string | null;
  /** 칸 아래 회색 도움말 (오류가 없을 때) */
  hint?: string;
}

/** 이름표 · 입력칸 · 오류 문장 한 벌. type="password" 면 보기 단추가 붙는다 */
export const Field = forwardRef<HTMLInputElement, Props>(function Field({ id, label, error, hint, type = "text", required, className, ...rest }, ref) {
  const [reveal, setReveal] = useState(false);
  const isPassword = type === "password";
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-[17px] font-bold">
        {label}
        {required && (
          <span className="ml-1 text-tag" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <div className="relative mt-2">
        <input
          ref={ref}
          id={id}
          type={isPassword && reveal ? "text" : type}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={clsx(
            FIELD_H,
            "w-full rounded-xl border-[1.5px] px-4 text-[18px] focus:outline-none",
            isPassword && "pr-14",
            error ? "border-tag focus:border-tag" : "border-muted/60 focus:border-brand",
          )}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            aria-label={reveal ? "비밀번호 숨기기" : "비밀번호 보기"}
            aria-pressed={reveal}
            className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-band"
          >
            {reveal ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
          </button>
        )}
      </div>
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
});
