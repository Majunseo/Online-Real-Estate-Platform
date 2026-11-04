/**
 * 국토교통부 아파트 매매 실거래가 상세 자료를 받아 server/data/molit/snapshot.json 으로 저장한다.
 *   npm run fetch:molit            최근 3개월 (이번 달 포함)
 *   npm run fetch:molit -- 202607 202609   시작 · 끝 달을 직접 준다
 *   npm run fetch:molit -- --missing       기존 스냅숏에 단지가 한 곳도 없는 시군구만 같은 기간으로 받아 합친다
 *                                          (API 일일 호출 한도에 걸렸거나 TARGET_SGG 에 지역을 더했을 때)
 *
 * 1) TARGET_SGG 의 시군구 × 달마다 실거래가 API 를 부른다 (MOLIT_SERVICE_KEY, MOLIT_ENDPOINT)
 * 2) 단지(aptSeq)별로 묶는다
 * 3) 단지 주소를 네이버 Geocoding 으로 좌표로 바꾼다 (NAVER_GEOCODE_CLIENT_ID/SECRET).
 *    결과는 geocode.json 에 남겨 다음 실행 때 다시 부르지 않는다.
 * 키는 .env 에서 읽고 화면이나 로그에 찍지 않는다.
 */
import fs from "fs";
import path from "path";
import type { Deal } from "../shared/types.ts";
import type { Snapshot, SnapshotComplex } from "../shared/snapshot.ts";
import { sidoByCode } from "../shared/regions.ts";
import { TARGET_SGG } from "../server/data/sgg.ts";
import { inSido } from "../server/data/geo.ts";

const OUT_DIR = path.resolve("server/data/molit");
const SNAPSHOT = path.join(OUT_DIR, "snapshot.json");
const GEOCODE_CACHE = path.join(OUT_DIR, "geocode.json");
const GEOCODE_URL = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode";

process.loadEnvFile(".env");
const env = (name: string) => {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`.env 에 ${name} 이 비어 있어요.`);
  return v;
};
const SECRETS = ["MOLIT_SERVICE_KEY", "NAVER_GEOCODE_CLIENT_ID", "NAVER_GEOCODE_CLIENT_SECRET"].map(env);
const redact = (s: string) => SECRETS.reduce((t, k) => t.split(k).join("***"), s);

// ── 1. 실거래가 API ─────────────────────────────────────────────

interface RawItem {
  [field: string]: string;
}

const XML_ENTITY: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
const decode = (s: string) => s.replace(/&(amp|lt|gt|quot|apos);/g, (e) => XML_ENTITY[e]).trim();

function parseItems(xml: string): { code: string; msg: string; total: number; items: RawItem[] } {
  const tag = (name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1] ?? "";
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, body]) => {
    const item: RawItem = {};
    for (const [, k, v] of body.matchAll(/<(\w+)>([^<]*)<\/\1>/g)) item[k] = decode(v);
    return item;
  });
  return { code: tag("resultCode"), msg: tag("resultMsg"), total: Number(tag("totalCount") || 0), items };
}

async function withRetry<T>(label: string, run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (err) {
      if (attempt >= 3) throw new Error(`${label}: ${redact(String(err))}`);
      await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
}

async function fetchMonth(lawd: string, ym: string): Promise<RawItem[]> {
  const key = env("MOLIT_SERVICE_KEY");
  const serviceKey = /%[0-9A-Fa-f]{2}/.test(key) ? key : encodeURIComponent(key); // 인코딩 키 · 디코딩 키 둘 다 받는다
  const base = env("MOLIT_ENDPOINT").replace(/\/+$/, "");
  const url = base.endsWith("getRTMSDataSvcAptTradeDev") ? base : `${base}/getRTMSDataSvcAptTradeDev`;
  const all: RawItem[] = [];
  for (let page = 1; ; page++) {
    const res = await withRetry(`${lawd} ${ym} p${page}`, async () => {
      const r = await fetch(`${url}?serviceKey=${serviceKey}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=${page}&numOfRows=1000`);
      const parsed = parseItems(await r.text());
      if (parsed.code !== "000") throw new Error(`HTTP ${r.status} resultCode=${parsed.code} ${parsed.msg}`);
      return parsed;
    });
    all.push(...res.items);
    if (all.length >= res.total || res.items.length === 0) return all;
  }
}

function toDeal(it: RawItem): Deal {
  return {
    amount: Number(it.dealAmount.replace(/,/g, "")),
    areaM2: Number(it.excluUseAr),
    floor: Number(it.floor),
    date: `${it.dealYear}-${it.dealMonth.padStart(2, "0")}-${it.dealDay.padStart(2, "0")}`,
    dealingType: it.dealingGbn === "직거래" ? "직거래" : "중개거래",
    canceled: Boolean(it.cdealType),
  };
}

const num = (s: string | undefined) => Number(s || 0);
const roadAddressOf = (it: RawItem) =>
  it.roadNm ? `${it.roadNm} ${num(it.roadNmBonbun)}${num(it.roadNmBubun) ? `-${num(it.roadNmBubun)}` : ""}` : "";

// ── 2. 단지별로 묶기 ────────────────────────────────────────────

type Draft = Omit<SnapshotComplex, "lat" | "lng">;

function groupByComplex(rows: { sidoCode: string; sggCode: string; sgg: string; item: RawItem }[]): Draft[] {
  const byId = new Map<string, Draft>();
  for (const { sidoCode, sggCode, sgg, item } of rows) {
    if (!item.aptSeq || !item.dealAmount) continue;
    const draft = byId.get(item.aptSeq) ?? {
      id: item.aptSeq,
      sggCode,
      name: item.aptNm,
      sidoCode,
      sido: sidoByCode(sidoCode)!.short,
      sgg,
      umd: item.umdNm,
      jibun: item.jibun,
      roadAddress: roadAddressOf(item),
      umdCd: item.umdCd || undefined,
      bun: item.bonbun || undefined,
      ji: item.bubun || undefined,
      buildYear: num(item.buildYear),
      deals: [],
    };
    draft.deals.push(toDeal(item));
    byId.set(item.aptSeq, draft);
  }
  for (const d of byId.values()) d.deals.sort((a, b) => b.date.localeCompare(a.date) || b.amount - a.amount);
  return [...byId.values()].filter((d) => d.deals.some((x) => !x.canceled));
}

// ── 3. 주소 → 좌표 ──────────────────────────────────────────────

type Cache = Record<string, [number, number] | null>;

async function geocode(query: string): Promise<[number, number] | null> {
  const r = await fetch(`${GEOCODE_URL}?query=${encodeURIComponent(query)}`, {
    headers: {
      "x-ncp-apigw-api-key-id": env("NAVER_GEOCODE_CLIENT_ID"),
      "x-ncp-apigw-api-key": env("NAVER_GEOCODE_CLIENT_SECRET"),
      accept: "application/json",
    },
  });
  if (r.status === 429 || r.status >= 500) throw new Error(`geocode HTTP ${r.status}`);
  if (!r.ok) throw new Error(`geocode HTTP ${r.status} ${redact(await r.text()).slice(0, 200)}`);
  const body = (await r.json()) as { addresses?: { x: string; y: string }[] };
  const a = body.addresses?.[0];
  return a ? [Number(a.y), Number(a.x)] : null;
}

/** 주소 검색에 쓸 시도 이름. 전남광주통합특별시는 지오코더가 옛 이름을 확실히 알아들으므로 옛 이름을 먼저 쓴다. */
function sidoNamesFor(d: Draft): string[] {
  const name = sidoByCode(d.sidoCode)!.name;
  if (d.sidoCode !== "12") return [name];
  return [d.sgg.endsWith("구") ? "광주광역시" : "전라남도", name];
}

/** 세종특별자치시는 아래에 시군구가 없다. "세종특별자치시 세종시 보람동 …" 으로 찾으면 지오코더가 못 찾는다. */
const sggPart = (d: Draft) => (d.sidoCode === "36" ? "" : `${d.sgg} `);

/** 지번 주소로 먼저, 안 되면 도로명 주소로. 시도 경계 밖으로 나오면 버린다. */
async function locate(d: Draft): Promise<[number, number] | null> {
  const queries = sidoNamesFor(d).flatMap((sido) => [
    d.jibun && `${sido} ${sggPart(d)}${d.umd} ${d.jibun}`,
    d.roadAddress && `${sido} ${sggPart(d)}${d.roadAddress}`,
  ]).filter(Boolean);
  for (const q of queries) {
    const hit = await withRetry(`geocode ${d.id}`, () => geocode(q));
    if (hit && inSido(d.sidoCode, hit[0], hit[1])) return hit;
  }
  return null;
}

async function mapLimit<T>(items: T[], limit: number, run: (item: T, i: number) => Promise<void>) {
  let next = 0;
  await Promise.all(Array.from({ length: limit }, async () => {
    while (next < items.length) {
      const i = next++;
      await run(items[i], i);
    }
  }));
}

// ── 실행 ────────────────────────────────────────────────────────

function monthRange(args: string[]): string[] {
  const now = new Date();
  const ym = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
  const [from, to] = args.length === 2 ? args : [ym(new Date(now.getFullYear(), now.getMonth() - 2, 1)), ym(now)];
  const out: string[] = [];
  for (let y = Number(from.slice(0, 4)), m = Number(from.slice(4)); `${y}${String(m).padStart(2, "0")}` <= to; m === 12 ? (y++, (m = 1)) : m++) {
    out.push(`${y}${String(m).padStart(2, "0")}`);
  }
  return out;
}

/**
 * 단지가 속한 시군구 코드. aptSeq 앞부분은 옛 코드로 남아 있을 수 있어(전남광주 · 화성) 쓰지 않는다.
 * sggCode 가 없던 예전 스냅숏은 (시도, 시군구 이름)으로 표에서 찾는다.
 */
function sggCodeOf(c: Omit<SnapshotComplex, "sggCode"> & { sggCode?: string }): string {
  return c.sggCode ?? TARGET_SGG.find(([sido, , name]) => sido === c.sidoCode && name === c.sgg)?.[1] ?? "";
}

async function main() {
  const args = process.argv.slice(2);
  const missingOnly = args.includes("--missing");
  const previous: Snapshot | null = fs.existsSync(SNAPSHOT) ? JSON.parse(fs.readFileSync(SNAPSHOT, "utf-8")) : null;
  previous?.complexes.forEach((c) => (c.sggCode = sggCodeOf(c)));
  if (missingOnly && !previous) throw new Error("--missing 은 기존 스냅숏이 있어야 해요. 먼저 npm run fetch:molit 을 돌려 주세요.");

  const months = missingOnly ? previous!.months.map((m) => m.replace("-", "")) : monthRange(args.filter((a) => /^\d{6}$/.test(a)));
  // 단지가 한 곳이라도 들어간 시군구는 끝난 것으로 본다 (거래는 받았는데 좌표를 하나도 못 찾은 곳은 다시)
  const done = new Set(missingOnly ? previous!.complexes.map((c) => c.sggCode) : []);
  const targets = TARGET_SGG.filter(([, lawd]) => !done.has(lawd));
  console.log(`실거래가: 시군구 ${targets.length}곳 × ${months.join(", ")}${missingOnly ? ` (기존 ${done.size}곳은 그대로 둔다)` : ""}`);

  const rows: { sidoCode: string; sggCode: string; sgg: string; item: RawItem }[] = [];
  const sggSummary: Snapshot["sgg"] = [];
  for (const [sidoCode, lawd, sgg] of targets) {
    let count = 0;
    for (const ym of months) {
      const items = await fetchMonth(lawd, ym);
      items.forEach((item) => rows.push({ sidoCode, sggCode: lawd, sgg, item }));
      count += items.length;
    }
    sggSummary.push({ code: lawd, name: sgg, sido: sidoByCode(sidoCode)!.short, deals: count });
    console.log(`  ${sidoByCode(sidoCode)!.short} ${sgg} (${lawd}) ${count}건`);
  }

  const drafts = groupByComplex(rows);
  console.log(`거래 ${rows.length}건 → 단지 ${drafts.length}곳. 좌표 찾는 중…`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const cache: Cache = fs.existsSync(GEOCODE_CACHE) ? JSON.parse(fs.readFileSync(GEOCODE_CACHE, "utf-8")) : {};
  let called = 0;
  await mapLimit(drafts, 6, async (d, i) => {
    if (!cache[d.id]) { // 처음 보는 단지, 또는 지난번에 못 찾은 단지
      cache[d.id] = await locate(d);
      called++;
    }
    if ((i + 1) % 500 === 0) {
      fs.writeFileSync(GEOCODE_CACHE, JSON.stringify(cache)); // 중간에 끊겨도 다음 실행이 이어 간다
      console.log(`  ${i + 1}/${drafts.length}`);
    }
  });
  fs.writeFileSync(GEOCODE_CACHE, JSON.stringify(cache));

  const fresh: SnapshotComplex[] = drafts.flatMap((d) => {
    const at = cache[d.id];
    return at ? [{ ...d, lat: Math.round(at[0] * 1e6) / 1e6, lng: Math.round(at[1] * 1e6) / 1e6 }] : [];
  });
  // --missing 이면 이미 받은 시군구는 그대로 두고 새로 받은 것만 더한다. 표에서 빠진 시군구는 버린다.
  const kept = missingOnly ? previous!.complexes.filter((c) => done.has(c.sggCode)) : [];
  const keptSgg = missingOnly ? previous!.sgg.filter((s) => done.has(s.code)) : [];
  const order = new Map(TARGET_SGG.map(([, lawd], i) => [lawd, i]));
  // 같은 단지가 두 번 들어가지 않게 (새로 받은 쪽을 남긴다)
  const complexes = [...new Map([...kept, ...fresh].map((c) => [c.id, c])).values()];
  const snapshot: Snapshot = {
    source: "국토교통부 아파트 매매 실거래가 상세 자료 (공공데이터포털), 좌표: 네이버 Geocoding",
    fetchedAt: new Date().toISOString(),
    months: months.map((m) => `${m.slice(0, 4)}-${m.slice(4)}`),
    sgg: [...keptSgg, ...sggSummary].sort((a, b) => (order.get(a.code) ?? 999) - (order.get(b.code) ?? 999)),
    complexes,
    skipped: (missingOnly ? previous!.skipped : 0) + drafts.length - fresh.length,
  };
  fs.writeFileSync(SNAPSHOT, JSON.stringify(snapshot));
  console.log(`저장: ${path.relative(process.cwd(), SNAPSHOT)} — 단지 ${complexes.length}곳 (좌표 못 찾음 ${snapshot.skipped}곳, 이번에 Geocoding ${called}번)`);
}

main().catch((err) => {
  console.error(redact(String(err)));
  process.exit(1);
});
