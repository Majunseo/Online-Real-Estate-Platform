/**
 * 전국초중등학교위치표준데이터(공공데이터포털, 한국교육시설안전원)로 학교 목록을 만든다.
 *   npm run build:schools -- <CSV 경로>
 *
 * 공공데이터포털에서 CSV 로 받거나, XLS 로 받았으면 엑셀에서 "CSV UTF-8" 로 저장해서 넣는다.
 * (옛 엑셀 형식 .xls 는 읽는 라이브러리를 들이지 않으려고 받지 않는다. CSV 는 UTF-8 · EUC-KR 둘 다 읽는다)
 *
 * 결과는 server/data/schools.json: [이름, 학교급 e|m|h, 설립 public|private, 위도, 경도].
 * 국립 · 공립은 "국공립" 하나로 묶는다. 운영 중인 학교만 남긴다.
 * 좌표가 그 학교 교육청의 시도 경계 밖이면 알려 준다 (다른 지역 같은 이름 학교 좌표가 들어간 경우를 찾으려고).
 * 경계 파일이 줄인 것이라 작은 섬 · 시도 경계 바로 옆 학교도 밖으로 나온다 (2026-11-04 판 18곳은 모두 이 경우였다).
 */
import fs from "fs";
import path from "path";
import { inSido } from "../server/data/geo.ts";
import { sidoByName } from "../shared/regions.ts";

const OUT = path.resolve("server/data/schools.json");
const src = process.argv[2];
if (!src || !src.toLowerCase().endsWith(".csv")) throw new Error("사용법: npm run build:schools -- <학교위치 .csv 경로> (XLS 는 엑셀에서 CSV UTF-8 로 저장해 주세요)");

/** UTF-8 로 읽어 깨지면 EUC-KR 로 다시 읽는다 */
function readText(file: string): string {
  const buf = fs.readFileSync(file);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("euc-kr").decode(buf);
  }
}

/** 따옴표 안의 쉼표 · 줄바꿈까지 처리하는 CSV 읽기 */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++;
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(cell), (cell = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell), rows.push(row), (row = []), (cell = "");
    } else cell += ch;
  }
  if (cell || row.length) row.push(cell), rows.push(row);
  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim()));
  return body.map((cells) => Object.fromEntries(head.map((h, i) => [h.trim(), (cells[i] ?? "").trim()])));
}

const LEVELS: Record<string, "e" | "m" | "h"> = { 초등학교: "e", 중학교: "m", 고등학교: "h" };

function main() {
  const rows = parseCsv(readText(src));
  const need = ["학교명", "학교급구분", "설립형태", "운영상태", "위도", "경도", "시도교육청명"];
  const missing = need.filter((k) => !(k in (rows[0] ?? {})));
  if (missing.length) throw new Error(`이 파일에 없는 항목: ${missing.join(", ")} (전국초중등학교위치표준데이터가 맞는지 확인해 주세요)`);

  const out: [string, "e" | "m" | "h", "public" | "private", number, number][] = [];
  const skipped: Record<string, number> = {};
  const skip = (why: string) => (skipped[why] = (skipped[why] ?? 0) + 1);
  const outside: string[] = [];
  for (const r of rows) {
    const level = LEVELS[r["학교급구분"]];
    const lat = Number(r["위도"]);
    const lng = Number(r["경도"]);
    if (!level) skip(`학교급 '${r["학교급구분"]}'`);
    else if (r["운영상태"] !== "운영") skip(`운영상태 '${r["운영상태"]}'`);
    else if (!(lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132)) skip("좌표 없음 · 국내 밖");
    else {
      const sido = sidoByName(r["시도교육청명"].replace(/교육청$/, ""));
      if (sido && !inSido(sido.code, lat, lng)) outside.push(`${r["학교명"]} (${r["시도교육청명"]}, ${lat}, ${lng})`);
      out.push([r["학교명"], level, r["설립형태"] === "사립" ? "private" : "public", Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6]);
    }
  }

  fs.writeFileSync(OUT, JSON.stringify({ source: "전국초중등학교위치표준데이터 (공공데이터포털, 한국교육시설안전원)", file: path.basename(src), schools: out }));
  const count = (l: string) => out.filter((s) => s[1] === l).length;
  console.log(`원본 ${rows.length}줄 → 학교 ${out.length}곳 (초 ${count("e")} · 중 ${count("m")} · 고 ${count("h")}) → ${path.relative(process.cwd(), OUT)}`);
  if (Object.keys(skipped).length) console.log("뺀 줄:", skipped);
  console.log(`교육청 시도 경계 밖 좌표: ${outside.length}곳 (섬 · 경계 근처면 정상, 멀리 떨어진 곳이면 주소를 확인)`);
  for (const o of outside.slice(0, 30)) console.log("  ", o);
}

main();
