import type { Bug } from "./types";

export type { Bug } from "./types";

/**
 * 결함 토글. Agora 와 같은 방식이다. 아직 등록된 결함이 없다.
 *
 *   npm run dev          정상 사이트 (기본값, 8094)
 *   npm run dev:bugs     전부 켬 (BUGS_ON=all, 8095)
 *   BUG_F1=1 npm run dev 지정한 것만
 *
 * 분야별 레지스트리(functional.ts 등)를 만들면 여기에 이어 붙인다.
 */
export const allBugs: Bug[] = [];

const enabled = new Set(
  process.env.BUGS_ON === "all"
    ? allBugs.map((b) => b.id)
    : allBugs.filter((b) => process.env[`BUG_${b.id}`] === "1").map((b) => b.id),
);

export function enabledIds(): string[] {
  return [...enabled];
}

export function isOn(id: string): boolean {
  return enabled.has(id);
}

/** 정답지. GET /gt.json 이 그대로 내보낸다. */
export function groundTruth() {
  const on = allBugs.filter((b) => enabled.has(b.id));
  return { site: "jipteo", generatedAt: new Date().toISOString(), total: allBugs.length, enabled: on.length, defects: on };
}
