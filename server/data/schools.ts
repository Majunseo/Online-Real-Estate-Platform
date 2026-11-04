import fs from "fs";
import path from "path";
import type { NearSchool, SchoolLevel, SchoolOwner } from "../../shared/types";

/**
 * 초 · 중 · 고등학교 (npm run build:schools 이 만든 server/data/schools.json). 없으면 단지에 학교 정보가 붙지 않는다.
 * 단지마다 학교급 × 설립(국공립 · 사립)별로 1km 안에서 가장 가까운 학교를 켜질 때 한 번 찾아 둔다 (최대 6곳).
 * 학교가 1만 2천 곳이라 위경도 0.01도 칸으로 나눠 두고 단지 주변 칸만 본다.
 */
const FILE = path.resolve(process.cwd(), "server/data/schools.json");
const LOOK_M = 1000;
const CELL = 0.01; // 위도 약 1.1km, 경도 약 0.9km

type Row = [name: string, level: SchoolLevel, owner: SchoolOwner, lat: number, lng: number];
const rows: Row[] = fs.existsSync(FILE) ? (JSON.parse(fs.readFileSync(FILE, "utf-8")) as { schools: Row[] }).schools : [];

const key = (i: number, j: number) => `${i},${j}`;
const grid = new Map<string, Row[]>();
for (const r of rows) {
  const k = key(Math.floor(r[3] / CELL), Math.floor(r[4] / CELL));
  (grid.get(k) ?? grid.set(k, []).get(k)!).push(r);
}

function distM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** 학교급 × 설립별 가장 가까운 학교 (1km 안, 가까운 순). 하나도 없으면 undefined */
export function nearSchools(lat: number, lng: number): NearSchool[] | undefined {
  const i0 = Math.floor(lat / CELL);
  const j0 = Math.floor(lng / CELL);
  const best = new Map<string, NearSchool>();
  for (let i = i0 - 1; i <= i0 + 1; i++) {
    for (let j = j0 - 2; j <= j0 + 2; j++) {
      for (const [name, level, owner, sLat, sLng] of grid.get(key(i, j)) ?? []) {
        const d = distM(lat, lng, sLat, sLng);
        if (d > LOOK_M) continue;
        const slot = `${level}-${owner}`;
        const prev = best.get(slot);
        if (!prev || d < prev.distanceM) best.set(slot, { name, level, owner, distanceM: Math.round(d) });
      }
    }
  }
  return best.size ? [...best.values()].sort((a, b) => a.distanceM - b.distanceM) : undefined;
}
