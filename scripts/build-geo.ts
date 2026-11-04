/**
 * 행정동 경계 한 파일로 지도용 경계 세 층을 만든다.
 *   node scripts/build-geo.ts <HangJeongDong_verYYYYMMDD.geojson>
 * 원본: https://github.com/vuski/admdongkor (ver20261001 등). 원자료 통계청 SGIS 행정동 경계(공공누리 1유형),
 *       가공물 CC BY 4.0. 출처 표기를 화면에 둔다 (ResultsPanel).
 *
 * 만드는 파일
 *   public/geo/sido.json          시도 경계 (동을 시도별로 합침)
 *   public/geo/sgg/{시도}.json    그 시도의 시군구 경계 (동을 시군구별로 합침)
 *   public/geo/dong/{시군구}.json 그 시군구의 행정동 경계
 * 속성은 { code, name }. 코드는 시도 2자리 · 시군구 5자리(실거래가 LAWD_CD 와 같다) · 행정동 10자리.
 */
import fs from "fs";
import path from "path";

type Pt = [number, number];
type Ring = Pt[];
type Poly = Ring[];

interface DongFeature {
  properties: { adm_nm: string; adm_cd2: string; sgg: string; sido: string; sggnm: string };
  geometry: { type: "MultiPolygon" | "Polygon"; coordinates: Poly[] | Poly };
}

const OUT = path.resolve("public/geo");

/** 층마다 줄이는 정도 (도 단위, 0.0001° ≈ 10m) 와 버릴 작은 섬 크기 */
const LEVEL = {
  sido: { tolerance: 0.0008, minArea: 0.0004 },
  sgg: { tolerance: 0.0003, minArea: 0.00002 },
  dong: { tolerance: 0.00008, minArea: 0 },
};

// ── 도형 도우미 ─────────────────────────────────────────────────

const area = (r: Ring) => {
  let s = 0;
  for (let i = 0; i < r.length - 1; i++) s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  return s / 2;
};

function inRing([x, y]: Pt, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Douglas-Peucker. 고리(처음 = 끝)를 그대로 받는다. */
function simplify(pts: Ring, tol: number): Ring {
  if (pts.length <= 4 || tol <= 0) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [];
  // 처음 = 끝인 고리는 한 직선으로 볼 수 없으니 가장 먼 점에서 한 번 나눈다
  let far = 1;
  for (let i = 1, best = -1; i < pts.length - 1; i++) {
    const d = (pts[i][0] - pts[0][0]) ** 2 + (pts[i][1] - pts[0][1]) ** 2;
    if (d > best) [best, far] = [d, i];
  }
  keep[far] = 1;
  stack.push([0, far], [far, pts.length - 1]);
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [x1, y1] = pts[a];
    const [x2, y2] = pts[b];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    let best = 0;
    let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [x, y] = pts[i];
      const d = len ? Math.abs(dy * (x - x1) - dx * (y - y1)) / len : Math.hypot(x - x1, y - y1);
      if (d > best) [best, idx] = [d, i];
    }
    if (best > tol) {
      keep[idx] = 1;
      stack.push([a, idx], [idx, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

const key = ([x, y]: Pt) => `${x.toFixed(6)},${y.toFixed(6)}`;
const unkey = (k: string): Pt => k.split(",").map(Number) as Pt;

/**
 * 붙어 있는 다각형들을 하나로 합친다. 이웃한 두 동이 공유하는 경계는 서로 반대 방향의 같은 변으로 들어 있으므로
 * 그런 변을 지우고, 남은 변을 이어 고리를 다시 만든다. 바깥 고리와 구멍은 방향(넓이 부호)으로 가른다.
 */
function dissolve(polys: Poly[]): Poly[] {
  const outerSign = Math.sign(area(polys[0][0])) || 1;
  const edges = new Map<string, number>();
  for (const poly of polys) {
    for (const ring of poly) {
      for (let i = 0; i < ring.length - 1; i++) {
        const a = key(ring[i]);
        const b = key(ring[i + 1]);
        if (a === b) continue;
        const back = `${b}|${a}`;
        const n = edges.get(back);
        if (n) n === 1 ? edges.delete(back) : edges.set(back, n - 1);
        else edges.set(`${a}|${b}`, (edges.get(`${a}|${b}`) ?? 0) + 1);
      }
    }
  }
  const next = new Map<string, string[]>();
  for (const [e, n] of edges) {
    const [a, b] = e.split("|");
    for (let i = 0; i < n; i++) (next.get(a) ?? next.set(a, []).get(a)!).push(b);
  }
  const rings: Ring[] = [];
  for (const start of next.keys()) {
    while (next.get(start)?.length) {
      const ring: string[] = [start];
      let cur = start;
      do {
        const outs = next.get(cur)!;
        cur = outs.pop()!;
        ring.push(cur);
      } while (cur !== start && next.get(cur)?.length);
      if (cur === start && ring.length >= 4) rings.push(ring.map(unkey));
    }
  }
  const outers = rings.filter((r) => Math.sign(area(r)) === outerSign).map((r) => [r] as Poly);
  for (const hole of rings.filter((r) => Math.sign(area(r)) !== outerSign)) {
    const owner = outers.find((p) => inRing(hole[0], p[0]));
    owner?.push(hole);
  }
  return outers;
}

/** 줄이고, 너무 작은 섬을 버리고, 좌표를 5자리(약 1m)로 자른다 */
function finish(polys: Poly[], { tolerance, minArea }: { tolerance: number; minArea: number }): Poly[] {
  const sorted = [...polys].sort((a, b) => Math.abs(area(b[0])) - Math.abs(area(a[0])));
  return sorted
    .filter((p, i) => i === 0 || Math.abs(area(p[0])) >= minArea)
    .map((p) => p.map((r) => simplify(r, tolerance).map(([x, y]) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5] as Pt)).filter((r) => r.length >= 4))
    .filter((p) => p.length > 0);
}

const collection = (features: { code: string; name: string; polys: Poly[] }[]) => ({
  type: "FeatureCollection",
  features: features.map(({ code, name, polys }) => ({
    type: "Feature",
    properties: { code, name },
    geometry: { type: "MultiPolygon", coordinates: polys },
  })),
});

const write = (file: string, data: unknown) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data));
};

/** "화성시만세구" → "화성시 만세구" */
const sggName = (s: string) => s.replace(/^(\S+?[시])(\S+[구])$/, "$1 $2");

// ── 실행 ────────────────────────────────────────────────────────

function main() {
  const src = process.argv[2];
  if (!src) throw new Error("usage: node scripts/build-geo.ts <HangJeongDong_verYYYYMMDD.geojson>");
  const features = (JSON.parse(fs.readFileSync(src, "utf-8")) as { features: DongFeature[] }).features;
  const polysOf = (f: DongFeature) => (f.geometry.type === "Polygon" ? [f.geometry.coordinates as Poly] : (f.geometry.coordinates as Poly[]));

  const bySido = new Map<string, DongFeature[]>();
  const bySgg = new Map<string, DongFeature[]>();
  for (const f of features) {
    (bySido.get(f.properties.sido) ?? bySido.set(f.properties.sido, []).get(f.properties.sido)!).push(f);
    (bySgg.get(f.properties.sgg) ?? bySgg.set(f.properties.sgg, []).get(f.properties.sgg)!).push(f);
  }

  fs.rmSync(path.join(OUT, "sgg"), { recursive: true, force: true });
  fs.rmSync(path.join(OUT, "dong"), { recursive: true, force: true });

  // 행정동
  for (const [sgg, dongs] of bySgg) {
    write(
      path.join(OUT, "dong", `${sgg}.json`),
      collection(dongs.map((f) => ({ code: f.properties.adm_cd2, name: f.properties.adm_nm.split(" ").at(-1)!, polys: finish(polysOf(f), LEVEL.dong) }))),
    );
  }

  // 시군구 (시도별 파일)
  for (const [sido, dongs] of bySido) {
    const codes = [...new Set(dongs.map((f) => f.properties.sgg))].sort();
    const sggs = codes.map((code) => {
      const members = bySgg.get(code)!;
      return { code, name: sggName(members[0].properties.sggnm), polys: finish(dissolve(members.flatMap(polysOf)), LEVEL.sgg) };
    });
    write(path.join(OUT, "sgg", `${sido}.json`), collection(sggs));
    console.log(`  ${sido} ${dongs[0].properties.adm_nm.split(" ")[0]}: 시군구 ${sggs.length} · 동 ${dongs.length}`);
  }

  // 시도
  const sidos = [...bySido].sort(([a], [b]) => a.localeCompare(b)).map(([code, dongs]) => ({
    code,
    name: dongs[0].properties.adm_nm.split(" ")[0],
    polys: finish(dissolve(dongs.flatMap(polysOf)), LEVEL.sido),
  }));
  write(path.join(OUT, "sido.json"), collection(sidos));

  const size = (p: string) => fs.statSync(p).size;
  const dir = (d: string) => fs.readdirSync(d).reduce((s, f) => s + size(path.join(d, f)), 0);
  console.log(
    `완료: sido.json ${(size(path.join(OUT, "sido.json")) / 1024).toFixed(0)}KB, sgg/ ${(dir(path.join(OUT, "sgg")) / 1024).toFixed(0)}KB, dong/ ${(dir(path.join(OUT, "dong")) / 1024).toFixed(0)}KB (${bySgg.size}개 파일)`,
  );
}

main();
