import { SIDO } from "../../shared/regions";
import { complexes } from "./complexes";
import { dongAreas, sggAreas } from "./geo";

/**
 * 검색어 자동완성. 입력한 글자로 시작하거나 들어 있는 지역(시도 · 시군구 · 동)과 단지를 몇 개씩 돌려준다.
 * 지역 이름표는 처음 부를 때 경계 파일에서 한 번 만든다.
 */
export interface Suggestion {
  kind: "sido" | "sgg" | "dong" | "complex";
  code: string; // 지역 코드 또는 단지 id
  name: string;
  detail: string; // 위 단계 지역 · 주소
}

let regionIndex: Suggestion[] | null = null;

function regions(): Suggestion[] {
  if (regionIndex) return regionIndex;
  regionIndex = SIDO.flatMap((s) => [
    { kind: "sido" as const, code: s.code, name: s.short, detail: s.name },
    ...sggAreas(s.code).flatMap((g) => [
      { kind: "sgg" as const, code: g.code, name: g.name, detail: s.short },
      ...dongAreas(g.code).map((d) => ({ kind: "dong" as const, code: d.code, name: d.name, detail: `${s.short} ${g.name}` })),
    ]),
  ]);
  return regionIndex;
}

/** 앞에서부터 맞으면 먼저, 그다음 중간에 들어 있는 것 */
function rank<T extends { name: string }>(items: T[], q: string, limit: number): T[] {
  const starts = items.filter((x) => x.name.startsWith(q));
  const contains = items.filter((x) => !x.name.startsWith(q) && x.name.includes(q));
  return [...starts, ...contains].slice(0, limit);
}

export function suggest(raw: string): Suggestion[] {
  const q = raw.trim().replace(/\s+/g, "");
  if (!q) return [];
  const regionHits = rank(
    regions().filter((r) => r.name.replace(/\s+/g, "").includes(q) || `${r.detail}${r.name}`.replace(/\s+/g, "").includes(q)),
    q,
    6,
  );
  const complexHits = rank(
    complexes.filter((c) => c.name.replace(/\s+/g, "").includes(q)).map((c) => ({ kind: "complex" as const, code: c.id, name: c.name, detail: `${c.sido} ${c.sgg} ${c.umd}` })),
    q,
    6,
  );
  return [...regionHits, ...complexHits];
}
