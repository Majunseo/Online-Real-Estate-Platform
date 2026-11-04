import { useState, type FormEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { PASSWORD_MAX, PASSWORD_MIN, validateName, validatePassword } from "@shared/auth";
import { ApiError, sendJson } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Field } from "@/components/form/Field";
import { Page, RequireLogin } from "@/components/page/Page";
import { useAuth } from "@/features/auth/AuthProvider";
import { useInboxCount } from "@/features/inbox/InboxCount";

type Errors = Record<string, string | null | undefined>;

/** 서버 오류를 칸 아래(field 가 있으면) 또는 양식 아래 문장으로 */
function toErrors(err: unknown): Errors {
  if (err instanceof ApiError) return err.body.field ? { [err.body.field]: err.message } : { form: err.message };
  return { form: "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
}

function Section({ id, title, description, tone, children }: { id: string; title: string; description?: string; tone?: "danger"; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={tone === "danger" ? "rounded-2xl border-2 border-tag/40 p-6" : "rounded-2xl border border-line p-6"}>
      <h2 id={id} className={tone === "danger" ? "text-[21px] font-bold text-tag" : "text-[21px] font-bold"}>
        {title}
      </h2>
      {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Done({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="mt-4 rounded-lg bg-brand-soft px-4 py-3 text-brand-strong">
      {children}
    </p>
  );
}

function FormError({ message }: { message?: string | null }) {
  return message ? (
    <p role="alert" className="mt-4 rounded-lg bg-tag/10 px-4 py-3 text-tag">
      {message}
    </p>
  ) : null;
}

/** 기본 정보와 이름 바꾸기 */
function Profile() {
  const { user, rename } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    const problem = validateName(name);
    setErrors({ name: problem });
    if (problem) return;
    setBusy(true);
    try {
      await rename(name.trim());
      setDone(true);
    } catch (err) {
      setErrors(toErrors(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="profile-title" title="기본 정보">
      <dl className="grid gap-3 text-[16px] sm:grid-cols-[120px_1fr]">
        <dt className="text-muted">이메일</dt>
        <dd className="font-bold">{user.email}</dd>
        <dt className="text-muted">가입일</dt>
        <dd>{formatDate(user.createdAt.slice(0, 10))}</dd>
      </dl>
      <form onSubmit={submit} noValidate className="mt-5 flex flex-wrap items-end gap-3">
        <Field id="account-name" label="이름" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} className="min-w-[240px] flex-1" />
        <button type="submit" disabled={busy || name.trim() === user.name} className="btn-outline h-[52px] px-5">
          이름 바꾸기
        </button>
      </form>
      <FormError message={errors.form} />
      {done && <Done>이름을 바꿨어요.</Done>}
    </Section>
  );
}

/** 비밀번호 바꾸기: 지금 비밀번호 확인 → 새 비밀번호 두 번. 바꾸면 다른 기기는 로그아웃된다 */
function PasswordChange() {
  const empty = { current: "", next: "", confirm: "" };
  const { refresh: refreshInbox } = useInboxCount();
  const [v, setV] = useState(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof empty, value: string) => setV((prev) => ({ ...prev, [k]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setDone(false);
    const found: Errors = {
      currentPassword: v.current ? null : "지금 비밀번호를 입력해 주세요.",
      newPassword: validatePassword(v.next) ?? (v.next === v.current ? "지금 비밀번호와 다른 비밀번호를 써 주세요." : null),
      confirm: v.confirm === v.next ? null : "새 비밀번호가 서로 달라요.",
    };
    setErrors(found);
    const first = Object.entries(found).find(([, m]) => m)?.[0];
    if (first) return document.getElementById(`pw-${first}`)?.focus();
    setBusy(true);
    try {
      await sendJson("PUT", "/api/account/password", { currentPassword: v.current, newPassword: v.next });
      setV(empty);
      setDone(true);
      refreshInbox(); // 서버가 "비밀번호가 바뀌었어요" 메시지를 보냈으므로 왼쪽 줄 숫자를 다시 센다
    } catch (err) {
      setErrors(toErrors(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section id="password-title" title="비밀번호 바꾸기" description="바꾸면 이 기기만 로그인 상태로 남고, 다른 기기에서는 로그아웃돼요.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field id="pw-currentPassword" label="지금 비밀번호" type="password" autoComplete="current-password" value={v.current} onChange={(e) => set("current", e.target.value)} error={errors.currentPassword} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="pw-newPassword"
            label="새 비밀번호"
            type="password"
            autoComplete="new-password"
            maxLength={PASSWORD_MAX}
            value={v.next}
            onChange={(e) => set("next", e.target.value)}
            error={errors.newPassword}
            hint={`영문과 숫자를 섞어 ${PASSWORD_MIN}자 이상`}
          />
          <Field id="pw-confirm" label="새 비밀번호 확인" type="password" autoComplete="new-password" maxLength={PASSWORD_MAX} value={v.confirm} onChange={(e) => set("confirm", e.target.value)} error={errors.confirm} />
        </div>
        <button type="submit" disabled={busy} className="btn-primary h-12 px-6">
          {busy ? "바꾸는 중…" : "비밀번호 바꾸기"}
        </button>
      </form>
      <FormError message={errors.form} />
      {done && <Done>비밀번호를 바꿨어요. 메시지함에도 알림을 남겼어요.</Done>}
    </Section>
  );
}

/** 회원 탈퇴: 지울 기록을 알리고, 비밀번호와 확인란을 받은 뒤 지운다 */
function Withdraw() {
  const { withdraw } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const found: Errors = { currentPassword: password ? null : "비밀번호를 입력해 주세요.", agree: agree ? null : "안내를 읽고 확인란에 체크해 주세요." };
    setErrors(found);
    if (found.currentPassword || found.agree) return;
    setBusy(true);
    try {
      await withdraw(password, agree);
      navigate("/", { replace: true, state: { withdrawn: true } });
    } catch (err) {
      setErrors(toErrors(err));
      setBusy(false);
    }
  };

  return (
    <Section id="withdraw-title" title="회원 탈퇴" tone="danger" description="탈퇴하면 아래 기록이 바로 지워지고 되돌릴 수 없어요. 같은 이메일로는 다시 가입할 수 있어요.">
      <ul className="list-disc space-y-1 pl-5 text-[15px]">
        <li>계정 정보(이메일 · 이름 · 비밀번호)와 모든 기기의 로그인</li>
        <li>관심 단지 · 저장한 검색 · 최근 본 단지 · 내 예산 · 내 계획</li>
        <li>내놓은 매물 · 메시지 · 고객센터와 광고 문의</li>
      </ul>
      <form onSubmit={submit} noValidate className="mt-5 space-y-4">
        <Field id="withdraw-password" label="비밀번호 확인" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.currentPassword} />
        <div>
          <label className="flex items-start gap-2.5 text-[15px]">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
              aria-invalid={errors.agree ? true : undefined}
              aria-describedby={errors.agree ? "withdraw-agree-error" : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 accent-tag"
            />
            <span>위 기록이 모두 지워지는 것을 확인했고, 탈퇴할게요.</span>
          </label>
          {errors.agree && (
            <p id="withdraw-agree-error" role="alert" className="mt-1.5 text-[15px] text-tag">
              {errors.agree}
            </p>
          )}
        </div>
        <button type="submit" disabled={busy} className="btn h-12 bg-tag px-6 text-white hover:bg-tag/90">
          {busy ? "탈퇴하는 중…" : "탈퇴하기"}
        </button>
      </form>
      <FormError message={errors.form} />
    </Section>
  );
}

/** 내 계정: 머리글의 회원 이름을 누르면 온다 */
export function AccountPage() {
  return (
    <Page title="내 계정" description="이름과 비밀번호를 바꾸거나 탈퇴할 수 있어요." width="max-w-[760px]">
      <RequireLogin what="내 계정">
        <div className="space-y-6">
          <Profile />
          <PasswordChange />
          <Withdraw />
        </div>
      </RequireLogin>
    </Page>
  );
}
