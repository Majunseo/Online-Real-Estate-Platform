import { useCallback, useEffect, useState } from "react";
import { computeBudget, type BudgetInput, type BudgetResult } from "@shared/budget";
import { getJson, sendJson } from "@/lib/api";
import { PERSONAL_KEYS } from "@/lib/personalData";
import { useAuth } from "@/features/auth/AuthProvider";

const LOCAL_KEY = PERSONAL_KEYS.budget;

/** 로그인 전 예산은 이 브라우저에만 둔다 (저장소를 못 쓰는 환경이면 화면을 닫을 때까지만 남는다). 로그인 · 로그아웃 · 탈퇴하면 지운다 */
function readLocal(): BudgetInput | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as BudgetInput) : null;
  } catch {
    return null;
  }
}
function writeLocal(v: BudgetInput) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(v));
  } catch {
    /* 저장하지 못해도 이번 화면에서는 쓴다 */
  }
}

/**
 * 내 예산. 로그인했으면 서버(GET/PUT /api/budget)에, 아니면 브라우저에 둔다.
 * save 는 서버가 다시 검사하므로 오류(ApiError)를 던질 수 있다.
 */
export function useBudget() {
  const { user } = useAuth();
  const [input, setInput] = useState<BudgetInput | null>(null);
  const [result, setResult] = useState<BudgetResult | null>(null);

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      const local = readLocal();
      setInput(local);
      setResult(local ? computeBudget(local) : null);
      return;
    }
    getJson<{ input: BudgetInput | null; result: BudgetResult | null }>("/api/budget")
      .then((r) => {
        setInput(r.input);
        setResult(r.result);
      })
      .catch(() => {
        setInput(null);
        setResult(null);
      });
  }, [user]);

  const save = useCallback(
    async (v: BudgetInput) => {
      if (user) {
        const r = await sendJson<{ input: BudgetInput; result: BudgetResult }>("PUT", "/api/budget", v);
        setInput(r.input);
        setResult(r.result);
      } else {
        writeLocal(v);
        setInput(v);
        setResult(computeBudget(v));
      }
    },
    [user],
  );

  return { input, result, save, savedToAccount: Boolean(user) };
}
