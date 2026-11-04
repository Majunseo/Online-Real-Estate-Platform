import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { clsx } from "clsx";
import type { PlanStep } from "@shared/types";
import { ApiError, getJson, sendJson } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Page, RequireLogin } from "@/components/page/Page";

/** 내 계획: 집을 사기까지의 단계를 체크하고 단계마다 메모를 남긴다 (회원별로 저장) */
export function PlanPage() {
  return (
    <Page title="내 계획" description="집을 사기까지의 단계를 하나씩 체크해 보세요. 메모도 남길 수 있어요." width="max-w-[860px]">
      <RequireLogin what="내 계획">
        <Steps />
      </RequireLogin>
    </Page>
  );
}

function Steps() {
  const [steps, setSteps] = useState<PlanStep[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<{ steps: PlanStep[] }>("/api/plan")
      .then((r) => setSteps(r.steps))
      .catch(() => setError("계획을 불러오지 못했어요."));
  }, []);

  const save = async (step: PlanStep, patch: Partial<Pick<PlanStep, "done" | "memo">>) => {
    setError(null);
    try {
      const r = await sendJson<{ steps: PlanStep[] }>("PUT", `/api/plan/${step.id}`, { done: patch.done ?? step.done, memo: patch.memo ?? step.memo });
      setSteps(r.steps);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "저장하지 못했어요. 다시 시도해 주세요.");
    }
  };

  if (!steps) return <p className="py-16 text-center text-muted">{error ?? "불러오는 중…"}</p>;
  const done = steps.filter((s) => s.done).length;

  return (
    <>
      <div className="flex items-center gap-4">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-band" role="progressbar" aria-label="진행" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}>
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / steps.length) * 100}%` }} />
        </div>
        <p className="shrink-0 text-[17px] font-bold">
          {done} / {steps.length} 단계
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-tag/10 px-4 py-2.5 text-tag">
          {error}
        </p>
      )}
      <ol className="mt-6 space-y-3">
        {steps.map((s, i) => (
          <StepItem key={s.id} step={s} index={i} onSave={(patch) => save(s, patch)} />
        ))}
      </ol>
    </>
  );
}

function StepItem({ step, index, onSave }: { step: PlanStep; index: number; onSave: (patch: Partial<Pick<PlanStep, "done" | "memo">>) => Promise<void> }) {
  const [memo, setMemo] = useState(step.memo);
  const [saving, setSaving] = useState(false);
  const dirty = memo.trim() !== step.memo;

  const run = async (patch: Partial<Pick<PlanStep, "done" | "memo">>) => {
    setSaving(true);
    await onSave(patch);
    setSaving(false);
  };

  return (
    <li className={clsx("rounded-2xl border p-4", step.done ? "border-brand/40 bg-brand-soft/50" : "border-line")}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={step.done}
          aria-label={`${index + 1}단계 ${step.title} ${step.done ? "완료 취소" : "완료"}`}
          disabled={saving}
          onClick={() => run({ done: !step.done })}
          className={clsx("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2", step.done ? "border-brand bg-brand text-white" : "border-muted/60 hover:border-brand")}
        >
          {step.done && <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />}
        </button>
        <div className="min-w-0 flex-1">
          <h2 className={clsx("text-[19px] font-bold", step.done && "text-muted")}>
            {index + 1}. {step.title}
          </h2>
          <p className="mt-0.5 text-[15px] text-muted">{step.description}</p>
          {step.link && (
            <Link to={step.link.to} className="mt-1 inline-block text-[15px] font-bold text-brand hover:underline">
              {step.link.label} →
            </Link>
          )}
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              run({ memo: memo.trim() });
            }}
          >
            <label htmlFor={`memo-${step.id}`} className="sr-only">
              {step.title} 메모
            </label>
            <input
              id={`memo-${step.id}`}
              value={memo}
              maxLength={200}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모 (200자까지)"
              className="h-10 min-w-0 flex-1 rounded-lg border-[1.5px] border-muted/50 px-3 text-[15px] focus:border-brand focus:outline-none"
            />
            <button type="submit" disabled={!dirty || saving} className="btn-outline h-10 px-4 py-0 text-[15px] disabled:opacity-40">
              저장
            </button>
          </form>
          {step.updatedAt && <p className="mt-1.5 text-[13px] text-muted">마지막 수정 {formatDate(step.updatedAt.slice(0, 10))}</p>}
        </div>
      </div>
    </li>
  );
}
