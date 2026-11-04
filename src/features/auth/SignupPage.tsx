import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { PASSWORD_MIN, validateEmail, validateName, validatePassword } from "@shared/auth";
import { Logo } from "@/components/layout/Logo";
import { SITE } from "@/config/site";
import { ApiError } from "@/lib/api";
import { AuthLayout } from "./AuthLayout";
import { safeNext, useAuth } from "./AuthProvider";
import { FIELD_H, Field } from "@/components/form/Field";

const GAP_LG = "mt-[clamp(0.75rem,3.5vh,2.5rem)]";
const GAP_SM = "mt-[clamp(0.5rem,1.8vh,1.1rem)]";

type FieldName = "email" | "name" | "password" | "confirm" | "terms";
type Errors = Partial<Record<FieldName, string>>;

interface Form {
  email: string;
  name: string;
  password: string;
  confirm: string;
  terms: boolean;
}

/** 화면에서 먼저 거르는 검사. 같은 규칙(shared/auth)으로 서버가 다시 판정한다 */
function check(f: Form): Errors {
  const errors: Errors = {};
  const set = (k: FieldName, v: string | null) => v && (errors[k] = v);
  set("email", validateEmail(f.email));
  set("name", validateName(f.name));
  set("password", validatePassword(f.password));
  if (!f.confirm) errors.confirm = "비밀번호를 한 번 더 입력해 주세요.";
  else if (f.confirm !== f.password) errors.confirm = "비밀번호가 서로 달라요.";
  if (!f.terms) errors.terms = "이용약관과 개인정보처리방침에 동의해 주세요.";
  return errors;
}

/** 회원가입. 로그인 첫 단계에서 넘어오면 이메일이 채워져 있다. 가입하면 바로 로그인된 채로 돌아간다 */
export function SignupPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { user, signup } = useAuth();

  const [form, setForm] = useState<Form>({ email: params.get("email") ?? "", name: "", password: "", confirm: "", terms: false });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    if (user && !busy) navigate(next, { replace: true });
  }, [user, busy, next, navigate]);

  const update = <K extends keyof Form>(key: K, value: Form[K]) => {
    const nextForm = { ...form, [key]: value };
    setForm(nextForm);
    if (touched) setErrors(check(nextForm)); // 한 번 제출한 뒤에는 고치는 대로 안내를 바꾼다
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    setFailure(null);
    const found = check(form);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) return document.getElementById(`signup-${first}`)?.focus();
    setBusy(true);
    try {
      await signup({ email: form.email, name: form.name, password: form.password });
      navigate(next, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.body.field) {
        setErrors({ [err.body.field]: err.message });
        document.getElementById(`signup-${err.body.field}`)?.focus();
      } else setFailure(err instanceof ApiError ? err.message : "잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout>
      <Logo />
      <h1 className={`${GAP_LG} text-[28px] font-extrabold tracking-tight`}>회원가입</h1>

      <form onSubmit={submit} className={GAP_SM} noValidate>
        <Field id="signup-email" label="이메일 주소" type="email" autoComplete="email" required value={form.email} onChange={(e) => update("email", e.target.value)} error={errors.email} />
        <Field id="signup-name" label="이름" autoComplete="name" required value={form.name} onChange={(e) => update("name", e.target.value)} error={errors.name} className={GAP_SM} />
        <Field
          id="signup-password"
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          required
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          error={errors.password}
          hint={`영문과 숫자를 넣어 ${PASSWORD_MIN}자 이상`}
          className={GAP_SM}
        />
        <Field
          id="signup-confirm"
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          required
          value={form.confirm}
          onChange={(e) => update("confirm", e.target.value)}
          error={errors.confirm}
          className={GAP_SM}
        />

        <div className={GAP_SM}>
          <label className="flex items-start gap-2.5 text-[15px]">
            <input
              id="signup-terms"
              type="checkbox"
              checked={form.terms}
              onChange={(e) => update("terms", e.target.checked)}
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? "signup-terms-error" : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 accent-brand"
            />
            <span className="break-keep">
              {SITE.name}{" "}
              <Link to="/terms" className="font-bold text-brand hover:underline">
                이용약관
              </Link>
              과{" "}
              <Link to="/privacy" className="font-bold text-brand hover:underline">
                개인정보처리방침
              </Link>
              에 동의해요 (필수)
            </span>
          </label>
          {errors.terms && (
            <p id="signup-terms-error" role="alert" className="mt-1.5 text-[15px] text-tag">
              {errors.terms}
            </p>
          )}
        </div>

        {failure && (
          <p role="alert" className={`${GAP_SM} rounded-lg bg-tag/10 px-4 py-2.5 text-[15px] text-tag`}>
            {failure}
          </p>
        )}

        <button type="submit" disabled={busy} className={`btn-primary ${GAP_SM} ${FIELD_H} w-full rounded-xl text-[19px] disabled:cursor-not-allowed disabled:bg-brand/35`}>
          {busy ? "가입하는 중…" : "가입하기"}
        </button>
      </form>

      <p className={`${GAP_SM} text-[17px]`}>
        이미 회원이세요?{" "}
        <Link to={`/login?${new URLSearchParams({ next })}`} className="font-bold text-brand hover:underline">
          로그인
        </Link>
      </p>
    </AuthLayout>
  );
}
