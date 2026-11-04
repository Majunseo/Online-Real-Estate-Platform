import type { Agent, SearchFilter } from "../../shared/types";
import { complexes, dealsOf, normalizeFilter } from "./complexes";
import { TARGET_SGG } from "./sgg";
import { sidoByCode } from "../../shared/regions";

/**
 * 중개사무소 목록. 공개된 중개업소 자료를 아직 받지 않아 화면 확인용 가상 사무소를 쓴다.
 * 이름 · 대표 · 주소 · 전화번호는 지어낸 것이다 (실제 사무소와 겹치지 않게 "집터"를 붙이고 번호는 0000).
 * 시군구별 중개거래 수만 실거래가 스냅숏에서 센 실제 값이다.
 */
const HEAD = ["햇살", "한빛", "푸른", "새봄", "다온", "늘품"];
const OWNER = ["김", "이", "박", "최", "정", "강", "윤", "한"];
const GIVEN = ["민준", "서연", "도윤", "하은", "지호", "수아", "예준", "지유"];
const SPECIALTY = ["아파트 매매", "신축 · 분양권", "재건축", "대단지", "역세권", "학군지"];

/** 시군구마다 사무소 두 곳 (코드로 정해져 매번 같다) */
const agents: Agent[] = TARGET_SGG.flatMap(([sidoCode, lawd, sgg], i) => {
  const sido = sidoByCode(sidoCode)!.short;
  const brokered = complexes
    .filter((c) => c.sggCode === lawd)
    .reduce((n, c) => n + dealsOf(c.id).filter((d) => !d.canceled && d.dealingType === "중개거래").length, 0);
  const umds = [...new Set(complexes.filter((c) => c.sggCode === lawd).map((c) => c.umd))];
  return [0, 1].map((k) => {
    const n = i * 2 + k;
    return {
      id: `${lawd}-${k + 1}`,
      name: `집터${HEAD[n % HEAD.length]}공인중개사사무소`,
      owner: `${OWNER[n % OWNER.length]}${GIVEN[(n * 3) % GIVEN.length]}`,
      sido,
      sgg,
      address: `${sido} ${sgg} ${umds[k % Math.max(umds.length, 1)] ?? ""} (가상 주소)`.replace(/\s+/g, " "),
      phone: `0507-0000-${String(1000 + n).slice(-4)}`,
      specialties: [SPECIALTY[n % SPECIALTY.length], SPECIALTY[(n + 2) % SPECIALTY.length]],
      sggBrokeredDeals: brokered,
    };
  });
});

/** GET /api/agents?sido=&sgg=&q= */
export function listAgents(raw: SearchFilter): { region: ReturnType<typeof normalizeFilter>["region"]; items: Agent[] } {
  const { filter, region } = normalizeFilter({ ...raw, dong: null });
  const words = filter.q.split(/\s+/).filter(Boolean);
  const items = agents.filter(
    (a) =>
      (!region.sido || a.sido === region.sido.name) &&
      (!filter.sgg || a.id.startsWith(filter.sgg)) &&
      words.every((w) => `${a.name} ${a.sido} ${a.sgg} ${a.address} ${a.specialties.join(" ")}`.includes(w)),
  );
  return { region, items };
}
