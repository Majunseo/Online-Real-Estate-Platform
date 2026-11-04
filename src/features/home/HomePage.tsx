import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { HomeData } from "@shared/types";
import { useJson } from "@/lib/api";
import { useMyLocation } from "@/lib/myLocation";
import { recentViews } from "@/lib/recentViews";
import { useAuth } from "@/features/auth/AuthProvider";
import { HOME_SECTIONS } from "./sections";

export function HomePage() {
  const { user } = useAuth();
  // 로그인 · 로그아웃하면(계정이 바뀌면) 위치 허용 여부를 다시 판단한다
  const { location, request } = useMyLocation(user?.id ?? (user === null ? "guest" : "checking"));
  const withdrawn = (useLocation().state as { withdrawn?: boolean } | null)?.withdrawn;
  // 로그인 전 최근 본 단지는 이 브라우저에 있는 것을 보낸다 (로그인했으면 서버가 계정 기록을 쓴다).
  // 계정이 바뀔 때마다 다시 읽는다 (로그아웃 · 탈퇴하면 브라우저 기록이 지워진다)
  const local = useMemo(() => recentViews(), [user]);

  // 로그인 여부와 위치 확인이 끝난 뒤에 한 번 받는다 (먼저 받았다가 다시 받아 화면이 바뀌지 않게)
  const ready = user !== undefined && location.status !== "checking";
  const q = new URLSearchParams();
  // 서버는 쿠키로 회원을 알지만, 로그아웃하면 주소가 달라져 다시 받도록 넣어 둔다
  q.set("as", user ? "member" : "guest");
  if (!user && local.length) q.set("recent", local.join(","));
  if (location.status === "ok") {
    q.set("lat", String(location.lat));
    q.set("lng", String(location.lng));
  }
  const { data, error } = useJson<HomeData>(ready ? `/api/home?${q}` : null);

  return (
    <>
      {withdrawn && (
        <p role="status" className="bg-brand-soft px-6 py-3 text-center text-brand-strong">
          탈퇴했어요. 그동안 집터를 이용해 주셔서 고마워요.
        </p>
      )}
      {error && (
        <p role="alert" className="bg-tag/10 px-6 py-3 text-center text-tag">
          추천 단지를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
      {HOME_SECTIONS.map(({ id, Component }) => (
        <Component key={id} data={data} location={location} requestLocation={request} />
      ))}
    </>
  );
}
