/**
 * 이 브라우저(localStorage)에 남기는 개인 기록의 키. 새 기록을 더할 때 여기에 키를 둔다.
 * 계정이 바뀌면(로그인 · 로그아웃 · 탈퇴) clearPersonalData 로 모두 지운다.
 * 앞 사람의 기록이 같은 브라우저를 쓰는 다음 사람(또는 탈퇴한 뒤의 화면)에 남지 않게 하려는 것이다.
 */
export const PERSONAL_KEYS = {
  /** 로그인 전에 최근 본 단지 */
  recentViews: "jipteo.recentViews",
  /** 로그인 전에 넣은 내 예산 */
  budget: "jipteo.budget",
  /** 첫 화면에서 "내 위치 주변 단지 보기"를 눌러 위치 사용을 허용했음 */
  useLocation: "jipteo.useLocation",
} as const;

export function clearPersonalData(): void {
  for (const key of Object.values(PERSONAL_KEYS)) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* 저장소를 못 쓰는 환경이면 남은 것도 없다 */
    }
  }
}
