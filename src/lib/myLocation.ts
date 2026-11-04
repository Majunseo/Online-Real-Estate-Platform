import { useCallback, useEffect, useState } from "react";
import { PERSONAL_KEYS } from "./personalData";

/**
 * 이용자의 현재 위치 (첫 화면 "내 주변 단지" 추천에만 쓴다).
 * 브라우저가 묻는 창은 이용자가 단추를 눌렀을 때만 띄운다 (들어오자마자 묻지 않는다).
 * 단추를 눌러 허용하면 이 브라우저에 표시(PERSONAL_KEYS.useLocation)를 남겨, 다음부터는 묻지 않고 바로 쓴다.
 * 브라우저의 위치 권한은 사이트가 거둘 수 없으므로, 로그인 · 로그아웃 · 탈퇴하면 이 표시를 지워(personalData.ts)
 * 다음 사람에게는 다시 단추부터 보이게 한다. 계정이 바뀌면 resetKey 를 바꿔 넘겨 다시 판단한다.
 * 좌표는 약 1km 단위(소수 둘째 자리)로 줄여서만 내보내고 저장하지 않는다.
 * 위치는 https 또는 localhost 에서만 쓸 수 있다 (http 로 연 사이트에서는 unavailable).
 */
export type MyLocation =
  | { status: "checking" } // 권한을 확인하거나 위치를 받는 중
  | { status: "ask" } // 아직 허용하지 않음 (단추를 누르면 브라우저가 묻는다)
  | { status: "denied" } // 이용자가 거부함 (브라우저 설정에서 바꿔야 한다)
  | { status: "unavailable" } // 이 브라우저 · 주소에서는 쓸 수 없거나 위치를 찾지 못함
  | { status: "ok"; lat: number; lng: number };

const round = (v: number) => Math.round(v * 100) / 100;

function allowedHere(): boolean {
  try {
    return localStorage.getItem(PERSONAL_KEYS.useLocation) === "1";
  } catch {
    return false;
  }
}
function setAllowedHere(on: boolean): void {
  try {
    if (on) localStorage.setItem(PERSONAL_KEYS.useLocation, "1");
    else localStorage.removeItem(PERSONAL_KEYS.useLocation);
  } catch {
    /* 표시를 못 남기면 다음에 단추를 한 번 더 누르면 된다 */
  }
}

export function useMyLocation(resetKey: unknown): { location: MyLocation; request: () => void } {
  const [location, setLocation] = useState<MyLocation>({ status: "checking" });

  const request = useCallback(() => {
    setLocation({ status: "checking" });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setAllowedHere(true);
        setLocation({ status: "ok", lat: round(p.coords.latitude), lng: round(p.coords.longitude) });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        if (denied) setAllowedHere(false);
        setLocation({ status: denied ? "denied" : "unavailable" });
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60_000 },
    );
  }, []);

  useEffect(() => {
    if (!window.isSecureContext || !("geolocation" in navigator)) return setLocation({ status: "unavailable" });
    if (!navigator.permissions) return setLocation({ status: "ask" });
    let alive = true;
    setLocation({ status: "checking" });
    navigator.permissions
      .query({ name: "geolocation" })
      .then((p) => {
        if (!alive) return;
        if (p.state === "denied") setLocation({ status: "denied" });
        // 브라우저가 허용했더라도, 이 브라우저에서 (지금 계정 상태로) 단추를 눌러 허용한 적이 있어야 바로 쓴다
        else if (p.state === "granted" && allowedHere()) request();
        else setLocation({ status: "ask" });
      })
      .catch(() => alive && setLocation({ status: "ask" }));
    return () => {
      alive = false;
    };
  }, [request, resetKey]);

  return { location, request };
}
