import type { Bug } from "./types";
import { functionalBugs } from "./functional";
import { validationBugs } from "./validation";
import { routingBugs } from "./routing";
import { uiBugs } from "./ui";

export type { Bug } from "./types";

/**
 * 결함 토글. Agora · Maison 과 같은 방식이다.
 *
 *   npm run dev          정상 사이트 (기본값, 8094)
 *   npm run dev:bugs     전부 켬 (BUGS_ON=all, 8095)
 *   BUG_F1=1 npm run dev 지정한 것만
 *
 * 같은 코드에서 환경변수만 달리해 띄우므로 "두 버전의 차이는 주입한 결함뿐" 이 보장된다.
 * 분야별 레지스트리는 분야 브랜치(feature/bugs-*)에서 각자 채운다.
 */
export const allBugs: Bug[] = [...functionalBugs, ...validationBugs, ...routingBugs, ...uiBugs];

{
  const seen = new Set<string>();
  for (const bug of allBugs) {
    if (seen.has(bug.id)) throw new Error(`결함 ID 가 겹칩니다: ${bug.id}`);
    seen.add(bug.id);
  }
}

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
