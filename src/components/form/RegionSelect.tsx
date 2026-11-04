import type { RegionsResult } from "@shared/types";
import { SIDO } from "@shared/regions";
import { useJson } from "@/lib/api";

/** 시도 → 시군구 두 단계 고르기. 시도를 바꾸면 시군구는 비운다 */
export function RegionSelect({ sido, sgg, onChange }: { sido: string; sgg: string; onChange: (sido: string, sgg: string) => void }) {
  const children = useJson<RegionsResult>(sido ? `/api/regions?sido=${sido}` : null);
  const select = "h-12 rounded-xl border-[1.5px] border-muted/60 bg-surface px-3 text-[17px] focus:border-brand focus:outline-none";
  return (
    <div className="flex flex-wrap gap-2">
      <label className="sr-only" htmlFor="region-sido">
        시도
      </label>
      <select id="region-sido" value={sido} onChange={(e) => onChange(e.target.value, "")} className={select}>
        <option value="">전국</option>
        {SIDO.map((s) => (
          <option key={s.code} value={s.code}>
            {s.short}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="region-sgg">
        시군구
      </label>
      <select id="region-sgg" value={sgg} onChange={(e) => onChange(sido, e.target.value)} disabled={!sido} className={select}>
        <option value="">{sido ? "시군구 전체" : "시도를 먼저 골라 주세요"}</option>
        {children.data?.items.map((r) => (
          <option key={r.code} value={r.code}>
            {r.name}
            {r.count === 0 ? " (자료 없음)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}
