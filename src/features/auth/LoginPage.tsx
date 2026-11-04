import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { validateEmail } from "@shared/auth";
import { Logo } from "@/components/layout/Logo";
import { SITE } from "@/config/site";
import { ApiError } from "@/lib/api";
import { AuthLayout } from "./AuthLayout";
import { safeNext, useAuth } from "./AuthProvider";
import { FIELD_H, Field } from "@/components/form/Field";
import { SOCIAL_PROVIDERS } from "./providers";

/** 간격은 화면 높이(vh)를 따라 줄고 는다. 작은 노트북에서도 스크롤 없이 한 화면에 들어오게. */
const GAP_LG = "mt-[clamp(1rem,4vh,3rem)]";
const GAP_MD = "mt-[clamp(0.75rem,3vh,2rem)]";
const GAP_SM = "mt-[clamp(0.5rem,2vh,1.25rem)]";

/**
 * 로그인. 질로우처럼 두 단계다.
 *   1) 이메일 → 가입된 이메일이면 2) 비밀번호, 아니면 회원가입 화면으로 (이메일을 넘겨 다시 적지 않게)
 * 마치면 ?next= 로 받은 곳(없으면 첫 화면)으로 돌아간다.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get("next"));
  const { user, checkEmail, login } = useAuth();

  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // 이미 로그인한 채로 들어오면 돌려보낸다
  useEffect(() => {
    if (user) navigate(next, { replace: true });
  }, [user, next, navigate]);

  useEffect(() => {
    if (step === "password") passwordRef.current?.focus();
  }, [step]);

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const submitEmail = (e: FormEvent) => {
    e.preventDefault();
    const problem = validateEmail(email);
    if (problem) return setError(problem);
    run(async () => {
      if (await checkEmail(email)) setStep("password");
      else navigate(`/signup?${new URLSearchParams({ email: email.trim(), next })}`);
    });
  };

  const submitPassword = (e: FormEvent) => {
    e.preventDefault();
    if (!password) return setError("비밀번호를 입력해 주세요.");
    run(async () => {
      await login(email, password);
      navigate(next, { replace: true });
    });
  };

  const backToEmail = () => {
    setStep("email");
    setPassword("");
    setError(null);
  };

  return (
    <AuthLayout>
      <Logo />
      <h1 className={`${GAP_LG} text-[28px] font-extrabold tracking-tight`}>로그인</h1>

      {step === "email" ? (
        <form onSubmit={submitEmail} className={GAP_MD} noValidate>
          <Field
            id="login-email"
            label="이메일 주소"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
          />
          <button type="submit" disabled={!email.trim() || busy} className={`btn-primary ${GAP_SM} ${FIELD_H} w-full rounded-xl text-[19px] disabled:cursor-not-allowed disabled:bg-brand/35`}>
            {busy ? "확인 중…" : "계속"}
          </button>
        </form>
      ) : (
        <form onSubmit={submitPassword} className={GAP_MD} noValidate>
          <p className="flex items-center justify-between gap-3 rounded-xl bg-band px-4 py-3 text-[17px]">
            <span className="truncate">{email.trim()}</span>
            <button type="button" onClick={backToEmail} className="shrink-0 font-bold text-brand hover:underline">
              변경
            </button>
          </p>
          <Field
            ref={passwordRef}
            id="login-password"
            label="비밀번호"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error}
            className={GAP_SM}
          />
          <button type="submit" disabled={!password || busy} className={`btn-primary ${GAP_SM} ${FIELD_H} w-full rounded-xl text-[19px] disabled:cursor-not-allowed disabled:bg-brand/35`}>
            {busy ? "로그인 중…" : "로그인"}
          </button>
        </form>
      )}

      <p className={`${GAP_MD} text-[17px]`}>
        {SITE.name}가 처음이세요?{" "}
        <Link to={`/signup?${new URLSearchParams({ next })}`} className="font-bold text-brand hover:underline">
          회원가입
        </Link>
      </p>

      <SocialLogins />

      <p className={`${GAP_LG} break-keep text-[14px] text-ink`}>
        계속하면 {SITE.name}{" "}
        <Link to="/terms" className="font-bold text-brand hover:underline">
          이용약관
        </Link>
        과{" "}
        <Link to="/privacy" className="font-bold text-brand hover:underline">
          개인정보처리방침
        </Link>
        에 동의하는 것으로 봅니다.
      </p>
    </AuthLayout>
  );
}

/** 간편 로그인. 아직 연동하지 않아 누르면 안내만 한다 (눌러도 아무 일 없는 단추로 두지 않는다) */
function SocialLogins() {
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <>
      <div className="my-[clamp(0.75rem,3.5vh,2.75rem)] flex items-center gap-4 text-[16px] text-muted" role="separator">
        <span className="h-px flex-1 bg-muted/60" />
        또는
        <span className="h-px flex-1 bg-muted/60" />
      </div>
      <ul className="space-y-[clamp(0.5rem,1.6vh,1rem)]">
        {SOCIAL_PROVIDERS.map(({ id, label, Icon }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => setNotice(`${label.replace("로 계속하기", "")} 간편 로그인은 준비 중이에요. 이메일로 로그인해 주세요.`)}
              className={`flex ${FIELD_H} w-full items-center gap-3 rounded-xl border-[1.5px] border-muted/60 px-5 text-[18px] hover:bg-band`}
            >
              <Icon />
              {label}
            </button>
          </li>
        ))}
      </ul>
      <p role="status" className="mt-2 min-h-[1.25rem] text-[14px] text-muted">
        {notice}
      </p>
    </>
  );
}
