import { useEffect, useState } from "react";

/**
 * 화면에서 결함 토글을 읽는다 (Agora 의 src/lib/bugs.ts 와 같은 역할).
 * 토글은 서버 환경변수(BUGS_ON · BUG_F1 …)로 정해지므로 GET /api/bugs 로 한 번 받아 온다.
 * 아직 못 받았으면 빈 목록, 즉 기본은 정상 동작이다.
 */

let cache: Promise<string[]> | null = null;
/** 받아 온 뒤의 켜진 목록. 훅을 쓸 수 없는 곳에서 bugOn() 으로 읽는다 */
const loaded = new Set<string>();
/** 한 번 받아 온 목록. 나중에 그려지는 화면은 첫 렌더부터 이 값을 쓴다 */
let resolved: string[] | null = null;

export function loadEnabled(): Promise<string[]> {
  cache ??= fetch("/api/bugs")
    .then((r) => r.json())
    .then((d: { enabled?: string[] }) => d.enabled ?? [])
    .catch(() => [] as string[])
    .then((list) => {
      resolved = list;
      list.forEach((id) => loaded.add(id));
      return list;
    });
  return cache;
}

/** 훅 밖에서 쓰는 토글. 아직 못 받았으면 false (정상 동작) */
export const bugOn = (id: string): boolean => loaded.has(id);

export function useEnabledBugs(): string[] {
  const [list, setList] = useState<string[]>(() => resolved ?? []);
  useEffect(() => {
    let alive = true;
    loadEnabled().then((l) => alive && setList(l));
    return () => {
      alive = false;
    };
  }, []);
  return list;
}

/** const bugU1 = useBug("U1"); */
export function useBug(id: string): boolean {
  return useEnabledBugs().includes(id);
}

// 처음 화면을 그리기 전에 미리 받아 둔다
void loadEnabled();
