import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getJson, sendJson } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";

interface FavoritesState {
  has: (complexId: string) => boolean;
  /** 담기 · 빼기. 로그인 전이면 로그인 화면으로 보낸다 */
  toggle: (complexId: string) => Promise<void>;
  count: number;
}

const FavoritesContext = createContext<FavoritesState | null>(null);

/** 관심 단지 ID 목록을 화면 전체에 나눠 준다. 카드 · 상세 · 관심 단지 화면이 같은 목록을 본다 */
export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return setIds([]);
    getJson<{ ids: string[] }>("/api/favorites")
      .then((r) => setIds(r.ids))
      .catch(() => setIds([]));
  }, [user]);

  const toggle = useCallback(
    async (complexId: string) => {
      if (!user) return navigate(`/login?${new URLSearchParams({ next: pathname + search })}`);
      const on = ids.includes(complexId);
      setIds((prev) => (on ? prev.filter((x) => x !== complexId) : [complexId, ...prev])); // 먼저 바꿔 보이고
      try {
        const r = await sendJson<{ ids: string[] }>(on ? "DELETE" : "PUT", `/api/favorites/${encodeURIComponent(complexId)}`);
        setIds(r.ids);
      } catch {
        setIds((prev) => (on ? [complexId, ...prev] : prev.filter((x) => x !== complexId))); // 실패하면 되돌린다
      }
    },
    [user, ids, navigate, pathname, search],
  );

  const value = useMemo(() => ({ has: (id: string) => ids.includes(id), toggle, count: ids.length }), [ids, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesState {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites 는 FavoritesProvider 안에서만 쓸 수 있어요.");
  return ctx;
}
