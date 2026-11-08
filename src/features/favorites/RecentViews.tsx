import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { History } from "lucide-react";
import type { Complex } from "@shared/types";
import { getJson, sendJson } from "@/lib/api";
import { clearRecentViews, recentViews } from "@/lib/recentViews";
import { ComplexCard } from "@/components/listing/ComplexCard";
import { useAuth } from "@/features/auth/AuthProvider";

/**
 * 최근 본 단지. 회원은 계정 기록(GET /api/recent-views), 로그인 전에는 이 브라우저의 기록을 ?ids= 로 보내 단지 정보를 받는다.
 *   section: 관심 단지 화면의 한 구역 (제목 · 기록 지우기 · 3열 격자)
 *   row:     단지 상세 아래 한 줄 (지금 보는 단지는 뺀다. 기록이 없으면 아무것도 안 그린다)
 */
export function RecentViews({ variant, exclude }: { variant: "section" | "row"; exclude?: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Complex[] | null>(null);

  useEffect(() => {
    if (user === undefined) return;
    let alive = true;
    const ids = user ? [] : recentViews();
    if (!user && ids.length === 0) return setItems([]);
    getJson<{ items: Complex[] }>(user ? "/api/recent-views" : `/api/recent-views?ids=${encodeURIComponent(ids.join(","))}`)
      .then((r) => alive && setItems(r.items))
      .catch(() => alive && setItems([]));
    return () => {
      alive = false;
    };
  }, [user]);

  const shown = (items ?? []).filter((c) => c.id !== exclude);

  const clear = async () => {
    if (user) await sendJson("DELETE", "/api/recent-views").catch(() => {});
    else clearRecentViews();
    setItems([]);
  };

  if (variant === "row") {
    if (shown.length === 0) return null;
    return (
      <section aria-labelledby="recent-row-title" className="mt-10">
        <h2 id="recent-row-title" className="section-title">
          최근 본 단지
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.slice(0, 3).map((c) => (
            <li key={c.id}>
              <ComplexCard c={c} className="w-full" />
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-labelledby="recent-title" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="recent-title" className="text-[20px] font-bold">
          최근 본 단지 {items ? `${shown.length}곳` : ""}
        </h2>
        {shown.length > 0 && (
          <button type="button" onClick={clear} className="text-[15px] font-bold text-muted hover:text-tag hover:underline">
            기록 지우기
          </button>
        )}
      </div>
      {items === null ? (
        <p className="mt-3 text-muted">불러오는 중…</p>
      ) : shown.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-band px-4 py-4 text-[15px] text-muted">
          <History className="h-5 w-5 shrink-0" aria-hidden="true" />
          단지 상세를 열어 보면 최근 10곳까지 여기에 남아요.{" "}
          <Link to="/search" className="font-bold text-brand hover:underline">
            지도에서 찾기
          </Link>
        </p>
      ) : (
        <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((c) => (
            <li key={c.id}>
              <ComplexCard c={c} className="w-full" />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
