import fs from "fs";
import path from "path";

/**
 * public/geo 의 경계 파일(scripts/build-geo.ts 가 만든다)을 서버에서 읽는다.
 * 시도 sido.json · 시군구 sgg/{시도}.json · 행정동 dong/{시군구}.json, 속성은 { code, name }.
 * 단지가 어느 시군구 · 동에 있는지는 좌표로 가린다 (실거래가의 동 이름은 법정동이라 행정동 경계와 이름이 맞지 않는다).
 */
type Ring = [number, number][];
type Poly = Ring[];

export interface Area {
  code: string;
  name: string;
  polys: Poly[];
  bbox: [number, number, number, number]; // minLng, minLat, maxLng, maxLat
}

interface GeoFile {
  features: { properties: { code: string; name: string }; geometry: { coordinates: Poly[] } }[];
}

const GEO_DIR = path.resolve(process.cwd(), "public/geo");
const cache = new Map<string, Area[]>();

function readAreas(relative: string): Area[] {
  const hit = cache.get(relative);
  if (hit) return hit;
  const file = path.join(GEO_DIR, relative);
  const areas = fs.existsSync(file)
    ? (JSON.parse(fs.readFileSync(file, "utf-8")) as GeoFile).features.map(({ properties, geometry }) => {
        const bbox: Area["bbox"] = [180, 90, -180, -90];
        for (const [outer] of geometry.coordinates) {
          for (const [x, y] of outer) {
            bbox[0] = Math.min(bbox[0], x);
            bbox[1] = Math.min(bbox[1], y);
            bbox[2] = Math.max(bbox[2], x);
            bbox[3] = Math.max(bbox[3], y);
          }
        }
        return { code: properties.code, name: properties.name, polys: geometry.coordinates, bbox };
      })
    : [];
  cache.set(relative, areas);
  return areas;
}

export const sidoAreas = () => readAreas("sido.json");
export const sggAreas = (sido: string) => readAreas(`sgg/${sido}.json`);
export const dongAreas = (sgg: string) => readAreas(`dong/${sgg}.json`);

function inRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function contains(area: Area, lat: number, lng: number): boolean {
  const [x0, y0, x1, y1] = area.bbox;
  if (lng < x0 || lng > x1 || lat < y0 || lat > y1) return false;
  return area.polys.some(([outer, ...holes]) => inRing(lng, lat, outer) && !holes.some((h) => inRing(lng, lat, h)));
}

const find = (areas: Area[], lat: number, lng: number) => areas.find((a) => contains(a, lat, lng));

export function inSido(code: string, lat: number, lng: number): boolean {
  const area = sidoAreas().find((a) => a.code === code);
  return !!area && contains(area, lat, lng);
}

/** 좌표가 든 시군구와 행정동. 경계 위나 바다 쪽으로 살짝 벗어난 점은 못 찾을 수 있다. */
export function locate(sido: string, lat: number, lng: number): { sgg?: Area; dong?: Area } {
  const sgg = find(sggAreas(sido), lat, lng);
  return { sgg, dong: sgg ? find(dongAreas(sgg.code), lat, lng) : undefined };
}
