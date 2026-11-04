/**
 * 전국도시철도역사정보표준데이터(공공데이터포털, 엑셀 파일)로 지하철역 목록을 만든다.
 *   npm run build:stations -- <내려받은 .xlsx 경로>
 *
 * 결과는 server/data/stations.json. 같은 이름의 역(환승역은 노선마다 한 줄씩 있다)을 하나로 묶고
 * 노선 이름을 흔히 부르는 이름(경부선 → 1호선 등)으로 바꾼다.
 * 원본에 좌표가 엉뚱한 역이 있다(2026-06-30 판: 양원역이 경북 봉화의 다른 양원역 좌표).
 * 같은 노선에서 가장 가까운 역이 30km 넘게 떨어진 역은 주소를 네이버 지오코딩으로 다시 찾는다.
 * 엑셀을 읽는 라이브러리를 들이지 않으려고 zip(xlsx) 을 직접 푼다.
 */
import fs from "fs";
import path from "path";
import zlib from "zlib";

const OUT = path.resolve("server/data/stations.json");
const src = process.argv[2];
if (!src) throw new Error("사용법: npm run build:stations -- <역사정보 .xlsx 경로>");

// ── 1. xlsx(zip) 에서 시트 읽기 ─────────────────────────────────

function unzip(buf: Buffer): Map<string, Buffer> {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (eocd < 0) throw new Error("xlsx(zip) 파일이 아니에요.");
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(at + 10);
    const size = buf.readUInt32LE(at + 20);
    const nameLen = buf.readUInt16LE(at + 28);
    const extraLen = buf.readUInt16LE(at + 30);
    const commentLen = buf.readUInt16LE(at + 32);
    const local = buf.readUInt32LE(at + 42);
    const name = buf.toString("utf8", at + 46, at + 46 + nameLen);
    const dataAt = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataAt, dataAt + size);
    files.set(name, method === 8 ? zlib.inflateRawSync(raw) : raw);
    at += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const unescape = (s: string) =>
  s.replace(/&(lt|gt|amp|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : ({ lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" } as Record<string, string>)[e.toLowerCase()],
  );
const texts = (xml: string) => [...xml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map((m) => unescape(m[1])).join("");

function readSheet(file: string): Record<string, string>[] {
  const files = unzip(fs.readFileSync(file));
  const shared = [...(files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "").matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const sheet = files.get("xl/worksheets/sheet1.xml")?.toString("utf8");
  if (!sheet) throw new Error("첫 번째 시트가 없어요.");
  const col = (ref: string) => [...ref.replace(/\d+/g, "")].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const rows = [...sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((r) => {
    const cells: string[] = [];
    for (const c of r[1].matchAll(/<c r="([A-Z]+\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const type = /t="(\w+)"/.exec(c[2])?.[1];
      const v = /<v>([^<]*)<\/v>/.exec(c[3] ?? "")?.[1];
      cells[col(c[1])] = type === "s" ? shared[Number(v)] : type === "inlineStr" ? texts(c[3] ?? "") : unescape(v ?? "");
    }
    return cells;
  });
  const [head, ...body] = rows;
  return body.map((cells) => Object.fromEntries(head.map((h, i) => [h, cells[i] ?? ""])));
}

// ── 2. 정리 ──────────────────────────────────────────────────────

/** 원본 노선 이름 → 흔히 부르는 이름. 없으면 원본 이름을 그대로 쓴다 */
const LINE_NAMES: Record<string, string> = {
  경부선: "1호선",
  경인선: "1호선",
  경원선: "1호선",
  장항선: "1호선",
  일산선: "3호선",
  안산과천선: "4호선",
  진접선: "4호선",
  "수도권 광역철도 8호선": "8호선",
  "수도권  도시철도 9호선": "9호선",
  "서울 도시철도 9호선": "9호선",
  분당선: "수인분당선",
  수인선: "수인분당선",
  인천국제공항선: "공항철도",
  "수도권 경량도시철도 신림선": "신림선",
  김포도시철도: "김포골드라인",
  의정부: "의정부경전철",
  에버라인: "용인에버라인",
  "인천지하철 1호선": "인천 1호선",
  "인천지하철 2호선": "인천 2호선",
  "도시철도 7호선": "7호선",
  자기부상철도: "인천공항 자기부상철도",
  "대전 도시철도 1호선": "대전 1호선",
  "광주도시철도 1호선": "광주 1호선",
  "대구 도시철도 1호선": "대구 1호선",
  "대구 도시철도 2호선": "대구 2호선",
  "대구 도시철도 3호선": "대구 3호선",
  "부산 도시철도 1호선": "부산 1호선",
  "부산 도시철도 2호선": "부산 2호선",
  "부산 도시철도 3호선": "부산 3호선",
  "부산 경량도시철도 4호선": "부산 4호선",
};

/** "공덕역" · "동대문역사문화공원(DDP)" → "공덕" · "동대문역사문화공원". 화면에서 "역"을 붙인다 */
const baseName = (s: string) => s.replace(/\(.*?\)/g, "").trim().replace(/역$/, "");

interface Row {
  name: string;
  line: string;
  lat: number;
  lng: number;
  address: string;
}

function distM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lng - a.lng) * rad) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  process.loadEnvFile(".env");
  const id = process.env.NAVER_GEOCODE_CLIENT_ID?.trim();
  const secret = process.env.NAVER_GEOCODE_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  const r = await fetch(`https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`, {
    headers: { "x-ncp-apigw-api-key-id": id, "x-ncp-apigw-api-key": secret, accept: "application/json" },
  });
  if (!r.ok) return null;
  const a = ((await r.json()) as { addresses?: { x: string; y: string }[] }).addresses?.[0];
  return a ? { lat: Number(a.y), lng: Number(a.x) } : null;
}

async function main() {
  const rows: Row[] = readSheet(src)
    .map((r) => ({ name: baseName(r["역사명"]), line: LINE_NAMES[r["노선명"]] ?? r["노선명"].trim(), lat: Number(r["역위도"]), lng: Number(r["역경도"]), address: r["역사도로명주소"] }))
    .filter((r) => r.name && Number.isFinite(r.lat) && Number.isFinite(r.lng));

  // 같은 노선 안에서 혼자 멀리 떨어진 역 = 좌표 오류로 보고 주소로 다시 찾는다
  for (const r of rows) {
    const peers = rows.filter((q) => q !== r && q.line === r.line);
    const nearest = Math.min(...peers.map((q) => distM(r, q)));
    if (peers.length && nearest > 30_000) {
      const fixed = await geocode(r.address.replace(/\(.*?\)/g, "").trim());
      console.log(`좌표 오류: ${r.name}역 (${r.line}) 같은 노선 가장 가까운 역까지 ${Math.round(nearest / 1000)}km → ${fixed ? `주소로 고침 (${fixed.lat.toFixed(5)}, ${fixed.lng.toFixed(5)})` : "고치지 못해 뺌"}`);
      if (fixed) Object.assign(r, fixed);
      else r.name = "";
    }
  }

  // 이름이 같고 700m 안에 있으면 한 역 (환승역 · 원본의 중복 줄). 좌표는 평균
  const stations: { name: string; lines: string[]; lat: number; lng: number }[] = [];
  const groups: Row[][] = [];
  for (const r of rows.filter((x) => x.name)) {
    const g = groups.find((g) => g[0].name === r.name && distM(g[0], r) < 700);
    if (g) g.push(r);
    else groups.push([r]);
  }
  for (const g of groups) {
    const avg = (k: "lat" | "lng") => Math.round((g.reduce((s, x) => s + x[k], 0) / g.length) * 1e6) / 1e6;
    stations.push({ name: g[0].name, lines: [...new Set(g.map((x) => x.line))].sort((a, b) => a.localeCompare(b, "ko", { numeric: true })), lat: avg("lat"), lng: avg("lng") });
  }
  stations.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  fs.writeFileSync(OUT, JSON.stringify({ source: "전국도시철도역사정보표준데이터 (공공데이터포털)", file: path.basename(src), stations }, null, 0));
  console.log(`원본 ${rows.length}줄 → 역 ${stations.length}곳, 노선 ${new Set(stations.flatMap((s) => s.lines)).size}개 → ${path.relative(process.cwd(), OUT)}`);
}

main().catch((err) => {
  console.error(String(err));
  process.exit(1);
});
