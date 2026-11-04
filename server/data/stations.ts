import fs from "fs";
import path from "path";
import type { NearStation } from "../../shared/types";

/**
 * 지하철역 (npm run build:stations 이 만든 server/data/stations.json). 없으면 단지에 역 정보가 붙지 않는다.
 * 단지마다 가장 가까운 역을 켜질 때 한 번 찾아 둔다 (단지 8천여 곳 × 역 9백여 곳, 위도 상자로 먼저 걸러 금방 끝난다).
 */
const FILE = path.resolve(process.cwd(), "server/data/stations.json");
const LOOK_M = 1000; // 이보다 먼 역은 "가까운 역"으로 보여 주지 않는다

interface Station {
  name: string;
  lines: string[];
  lat: number;
  lng: number;
}

const stations: Station[] = fs.existsSync(FILE) ? (JSON.parse(fs.readFileSync(FILE, "utf-8")) as { stations: Station[] }).stations : [];

function distM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const rad = Math.PI / 180;
  const h = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h));
}

/** 역 하나를 가리키는 키 (이름만으로는 대전 · 부산 · 서울 시청역이 겹친다) */
export const stationKey = (s: { name: string; lines: string[] }) => `${s.name}|${s.lines.join(",")}`;

/** 지도 표시용 역 [이름, 노선들, 위도, 경도]. keys 에 든 역만 */
export const stationPoints = (keys: Set<string>): [string, string[], number, number][] =>
  stations.filter((s) => keys.has(stationKey(s))).map((s) => [s.name, s.lines, s.lat, s.lng]);

export function nearestStation(lat: number, lng: number): NearStation | undefined {
  const dLat = LOOK_M / 111_000;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  let best: NearStation | undefined;
  for (const s of stations) {
    if (Math.abs(s.lat - lat) > dLat || Math.abs(s.lng - lng) > dLng) continue;
    const d = distM(lat, lng, s.lat, s.lng);
    if (d <= LOOK_M && (!best || d < best.distanceM)) best = { name: s.name, lines: s.lines, distanceM: Math.round(d) };
  }
  return best;
}
