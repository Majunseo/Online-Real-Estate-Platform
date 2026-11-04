/**
 * 로그인 실패 제한. 같은 이메일로 10분 안에 5번 틀리면 잠시 막는다 (비밀번호 무작위 대입 방지).
 * 메모리에만 두므로 서버를 다시 켜거나 /_reset 하면 풀린다.
 */
const WINDOW_MS = 10 * 60_000;
const MAX_FAILS = 5;

const fails = new Map<string, number[]>();

const recent = (key: string, now = Date.now()) => (fails.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

/** 막혀 있으면 다시 시도할 수 있을 때까지 남은 초, 아니면 0 */
export function blockedFor(key: string): number {
  const times = recent(key);
  if (times.length < MAX_FAILS) return 0;
  return Math.ceil((times[0] + WINDOW_MS - Date.now()) / 1000);
}

export function recordFailure(key: string): void {
  fails.set(key, [...recent(key), Date.now()]);
}

export function clearFailures(key: string): void {
  fails.delete(key);
}

export function resetThrottle(): void {
  fails.clear();
}
