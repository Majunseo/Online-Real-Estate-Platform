import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@shared/auth";
import { getJson, postJson, sendJson } from "@/lib/api";
import { clearPersonalData } from "@/lib/personalData";

interface AuthState {
  /** 로그인한 회원. 아직 확인 중이면 undefined, 로그인 안 했으면 null */
  user: User | null | undefined;
  /** 가입된 이메일인지 (로그인 첫 단계) */
  checkEmail: (email: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: { email: string; name: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  /** 내 계정: 이름 바꾸기 · 탈퇴 (탈퇴하면 로그아웃 상태가 된다) */
  rename: (name: string) => Promise<User>;
  withdraw: (password: string, confirm: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * 로그인 상태를 화면 전체에 나눠 준다. 상태의 근거는 서버의 HttpOnly 쿠키이고,
 * 여기서는 GET /api/auth/me 로 누가 로그인했는지만 받아 둔다 (토큰은 화면 스크립트가 볼 수 없다).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    getJson<{ user: User | null }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
  }, []);

  const checkEmail = useCallback((email: string) => postJson<{ exists: boolean }>("/api/auth/check-email", { email }).then((r) => r.exists), []);
  const login = useCallback(async (email: string, password: string) => {
    const r = await postJson<{ user: User }>("/api/auth/login", { email, password });
    clearPersonalData(); // 계정이 바뀌면 이 브라우저의 개인 기록(최근 본 단지 · 예산 · 위치 허용)을 지운다
    setUser(r.user);
    return r.user;
  }, []);
  const signup = useCallback(async (input: { email: string; name: string; password: string }) => {
    const r = await postJson<{ user: User }>("/api/auth/signup", input);
    clearPersonalData();
    setUser(r.user);
    return r.user;
  }, []);
  const logout = useCallback(async () => {
    await postJson("/api/auth/logout");
    clearPersonalData();
    setUser(null);
  }, []);

  const rename = useCallback(async (name: string) => {
    const r = await sendJson<{ user: User }>("PUT", "/api/account/name", { name });
    setUser(r.user);
    return r.user;
  }, []);
  const withdraw = useCallback(async (password: string, confirm: boolean) => {
    await postJson("/api/account/delete", { password, confirm });
    clearPersonalData();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, checkEmail, login, signup, logout, rename, withdraw }), [user, checkEmail, login, signup, logout, rename, withdraw]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 는 AuthProvider 안에서만 쓸 수 있어요.");
  return ctx;
}

/** 로그인 · 가입을 마치고 돌아갈 곳. 다른 사이트 주소로 튀지 않게 이 사이트 안의 경로만 받는다 */
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login") && !next.startsWith("/signup") ? next : "/";
}
