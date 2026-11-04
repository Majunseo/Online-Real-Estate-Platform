import { resetThrottle } from "./auth/throttle";
import { resetDb } from "./db";

/**
 * 사용자가 바꾸는 상태 전체. 회원 · 세션은 SQLite(server/db), 로그인 실패 횟수는 메모리.
 * 실거래가 단지 자료는 읽기 전용 스냅숏이라 되돌릴 것이 없다.
 */

/** POST /_reset. 모든 상태를 시드로 되돌린다 (테스트 계정 두 개만 남는다) */
export function resetStore(): void {
  resetDb();
  resetThrottle();
}
