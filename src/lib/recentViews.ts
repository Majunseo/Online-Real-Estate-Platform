import { PERSONAL_KEYS } from "./personalData";

/**
 * 로그인 전에 최근 본 단지. 이 브라우저에만 저장하고 첫 화면 추천에만 쓴다.
 * 로그인한 회원은 계정에 쌓고(POST /api/recent-views), 로그인 · 로그아웃 · 탈퇴할 때 이 브라우저 기록은 지운다
 * (personalData.ts: 앞 사람이 본 것이 회원 추천에 섞이거나, 같은 브라우저를 쓰는 다른 사람에게 남지 않게).
 * 저장소를 쓸 수 없는 환경(사생활 보호 창 등)이면 기록하지 않고 조용히 넘어간다.
 */
const KEY = PERSONAL_KEYS.recentViews;
const MAX = 10;

export function recentViews(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const ids = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function clearRecentViews(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 저장소를 못 쓰는 환경이면 남은 것도 없다 */
  }
}

export function rememberView(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([id, ...recentViews().filter((x) => x !== id)].slice(0, MAX)));
  } catch {
    /* 저장하지 못해도 화면에는 영향 없음 */
  }
}
