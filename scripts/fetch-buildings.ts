/**
 * 건축물대장(국토교통부_건축HUB_건축물대장정보 서비스) 표제부로 단지별 최고층 · 세대수 · 동수 등을 모은다.
 *   npm run fetch:buildings          아직 안 받은 단지만 (이어 받기)
 *   npm run fetch:buildings -- --all 처음부터 다시
 *
 * 실거래가 스냅숏(server/data/molit/snapshot.json)의 단지마다 지번(시군구 · 법정동 코드 · 본번 · 부번)으로 표제부를 부르고,
 * 결과를 server/data/molit/buildings.json 에 { 단지 id: 요약 | null } 로 쌓는다 (null = 그 지번에 공동주택 건물이 없음).
 * 이 API 는 초당 호출 제한이 빡빡해서(동시에 여러 개 보내면 한동안 막힌다) 한 번에 하나씩, 간격을 두고 부른다.
 * 초당 제한(코드 23)에 걸리면 기다렸다 다시 부르고, 일일 한도(코드 22)에 걸리면 거기까지 저장하고 멈춘다.
 * 다음 날 다시 돌리면 이어서 받는다.
 * 키는 .env 의 BLD_SERVICE_KEY · BLD_ENDPOINT 이고 화면이나 로그에 찍지 않는다.
 */
import fs from "fs";
import path from "path";
import type { Snapshot } from "../shared/snapshot.ts";
import type { BuildingInfo } from "../shared/types.ts";

const OUT = path.resolve("server/data/molit/buildings.json");
const SNAPSHOT = path.resolve("server/data/molit/snapshot.json");

process.loadEnvFile(".env");
const KEY = process.env.BLD_SERVICE_KEY?.trim();
const ENDPOINT = process.env.BLD_ENDPOINT?.trim().replace(/\/+$/, "");
if (!KEY || !ENDPOINT) throw new Error(".env 에 BLD_SERVICE_KEY · BLD_ENDPOINT 를 넣어 주세요.");
const redact = (s: string) => s.split(KEY).join("***");

/** 일일 한도처럼 오늘은 더 부를 수 없는 오류 */
class QuotaError extends Error {}

const GAP_MS = 400; // 요청 사이 간격
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

interface TitleItem {
  dongNm?: string;
  mainPurpsCdNm?: string;
  grndFlrCnt?: number | string;
  hhldCnt?: number | string;
  useAprDay?: string | number;
  rideUseElvtCnt?: number | string;
  emgenUseElvtCnt?: number | string;
  indrAutoUtcnt?: number | string;
  oudrAutoUtcnt?: number | string;
  indrMechUtcnt?: number | string;
  oudrMechUtcnt?: number | string;
}

const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

async function titleItems(sigunguCd: string, bjdongCd: string, bun: string, ji: string): Promise<TitleItem[]> {
  const all: TitleItem[] = [];
  for (let page = 1; page <= 10; page++) {
    const url = `${ENDPOINT}/getBrTitleInfo?serviceKey=${KEY}&sigunguCd=${sigunguCd}&bjdongCd=${bjdongCd}&platGbCd=0&bun=${bun}&ji=${ji}&numOfRows=100&pageNo=${page}&_type=json`;
    let body: { response?: { header?: { resultCode?: string; resultMsg?: string }; body?: { items?: { item?: TitleItem | TitleItem[] }; totalCount?: number } } } = {};
    for (let attempt = 1; ; attempt++) {
      await sleep(GAP_MS);
      try {
        const r = await fetch(url);
        const text = await r.text();
        if (/PER_SECOND|"returnReasonCode"\s*:\s*"23"/.test(text)) throw new Error("초당 제한"); // 기다렸다 다시
        if (/LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS|"returnReasonCode"\s*:\s*"22"/.test(text)) throw new QuotaError("일일 호출 한도에 걸렸어요.");
        if (r.status >= 500 || !text.trim()) throw new Error(`HTTP ${r.status} 빈 응답`);
        body = JSON.parse(text);
        break;
      } catch (err) {
        if (err instanceof QuotaError) throw err;
        if (attempt >= 8) throw new Error(redact(String(err)));
        await sleep(Math.min(60_000, 5_000 * attempt)); // 5초, 10초, … 최대 1분
      }
    }
    const code = body?.response?.header?.resultCode;
    if (code && code !== "00") {
      if (code === "22") throw new QuotaError(`일일 호출 한도에 걸렸어요 (${code}).`);
      throw new Error(`resultCode=${code} ${body?.response?.header?.resultMsg ?? ""}`);
    }
    const items = body?.response?.body?.items?.item;
    const list: TitleItem[] = Array.isArray(items) ? items : items ? [items] : [];
    all.push(...list);
    const total = n(body?.response?.body?.totalCount);
    if (all.length >= total || list.length === 0) break;
  }
  return all;
}

/** 표제부 건물들을 단지 하나로 요약한다. 세대가 있는 공동주택 동만 "아파트 동"으로 본다 */
function summarize(items: TitleItem[]): BuildingInfo | null {
  const homes = items.filter((x) => x.mainPurpsCdNm === "공동주택" && n(x.hhldCnt) > 0);
  if (!homes.length) return null;
  const approved = homes.map((x) => String(x.useAprDay ?? "").trim()).filter((d) => /^\d{8}$/.test(d)).sort();
  return {
    households: homes.reduce((s, x) => s + n(x.hhldCnt), 0),
    dongs: homes.length,
    maxFloor: Math.max(...homes.map((x) => n(x.grndFlrCnt))),
    approvedAt: approved[0] ? `${approved[0].slice(0, 4)}-${approved[0].slice(4, 6)}-${approved[0].slice(6, 8)}` : null,
    elevators: items.reduce((s, x) => s + n(x.rideUseElvtCnt) + n(x.emgenUseElvtCnt), 0),
    parking: items.reduce((s, x) => s + n(x.indrAutoUtcnt) + n(x.oudrAutoUtcnt) + n(x.indrMechUtcnt) + n(x.oudrMechUtcnt), 0),
  };
}

async function main() {
  const all = process.argv.includes("--all");
  const snapshot = JSON.parse(fs.readFileSync(SNAPSHOT, "utf-8")) as Snapshot;
  const done: Record<string, BuildingInfo | null> = !all && fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf-8")) : {};
  const todo = snapshot.complexes.filter((c) => !(c.id in done) && c.umdCd && c.bun);
  const noKey = snapshot.complexes.filter((c) => !c.umdCd || !c.bun).length;
  console.log(`건축물대장: 단지 ${snapshot.complexes.length}곳 중 받을 곳 ${todo.length} (이미 ${Object.keys(done).length}, 지번 없음 ${noKey})`);

  let next = 0;
  let called = 0;
  let stopped: string | null = null;
  const save = () => fs.writeFileSync(OUT, JSON.stringify(done));
  // 한 번에 하나씩 (이 API 는 동시에 보내면 초당 제한에 걸린다)
  await Promise.all(
    Array.from({ length: 1 }, async () => {
      while (!stopped && next < todo.length) {
        const c = todo[next++];
        try {
          done[c.id] = summarize(await titleItems(c.sggCode, c.umdCd!, c.bun!, c.ji ?? "0000"));
          called++;
          if (called % 250 === 0) {
            save();
            console.log(`  ${called}/${todo.length}`);
          }
        } catch (err) {
          if (err instanceof QuotaError) stopped = err.message;
          else console.warn(`  ${c.id} ${c.name}: ${redact(String(err))}`); // 이 단지만 건너뛰고 다음 실행 때 다시
        }
      }
    }),
  );
  save();
  const values = Object.values(done);
  console.log(
    `${stopped ? `멈춤: ${stopped} 내일 다시 돌리면 이어 받아요. ` : "완료. "}이번에 ${called}곳 · 누적 ${values.length}곳 (공동주택 정보 있음 ${values.filter(Boolean).length}, 없음 ${values.filter((v) => !v).length})`,
  );
}

main().catch((err) => {
  console.error(redact(String(err)));
  process.exit(1);
});
