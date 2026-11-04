import { GraduationCap } from "lucide-react";
import { SCHOOL_DISTANCES, SCHOOL_DIST_DEFAULT, schoolLevelsOf, type ListFilter, type SchoolLevelKey } from "@shared/filters";
import { FilterMenu } from "../FilterMenu";

const LEVELS: { value: SchoolLevelKey; label: string; short: string }[] = [
  { value: "e", label: "초등학교", short: "초" },
  { value: "m", label: "중학교", short: "중" },
  { value: "h", label: "고등학교", short: "고" },
];
const OWNERS: { value: "public" | "private"; label: string }[] = [
  { value: "public", label: "국공립" },
  { value: "private", label: "사립" },
];

function Check({ label, checked, onChange, strong, disabled }: { label: string; checked: boolean; onChange: (on: boolean) => void; strong?: boolean; disabled?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 py-1 text-[16px] has-[:disabled]:cursor-default">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 shrink-0 accent-brand" />
      <span className={strong ? "font-bold text-brand" : undefined}>{label}</span>
    </label>
  );
}

/**
 * 지도 위 "학교" 단추 (Zillow 의 Schools 자리). 학교 핀은 찍지 않고, 고른 학교가 가까운 단지만 지도 묶음과 목록에 남긴다.
 * 학교급은 하나라도 맞으면(또는) 된다. 설립은 처음에 국공립 · 사립 둘 다 체크(모두)이고, 하나를 빼면 남은 것만 본다
 * (마지막 하나는 뺄 수 없다: 둘 다 뺀 것과 둘 다 고른 것이 같은 뜻이 되어 헷갈리지 않게). 거리는 직선 거리.
 * 한국에는 GreatSchools 같은 학교별 공개 평점이 없어서 평점 자리에 거리 조건을 둔다.
 */
export function SchoolMenu({ list, onList, buttonClassName }: { list: ListFilter; onList: (l: ListFilter) => void; buttonClassName: string }) {
  const levels = schoolLevelsOf(list);
  const owners: ("public" | "private")[] = list.schoolOwner ? [list.schoolOwner] : ["public", "private"];
  const dist = list.schoolDist ?? SCHOOL_DIST_DEFAULT;

  const write = (nextLevels: SchoolLevelKey[], nextOwners: ("public" | "private")[], nextDist: number) => {
    const on = nextLevels.length > 0;
    onList({
      ...list,
      school: on ? nextLevels.join(",") : null,
      // 둘 다 고른 것은 안 고른 것과 같다 (모두)
      schoolOwner: on && nextOwners.length === 1 ? nextOwners[0] : null,
      schoolDist: on && nextDist !== SCHOOL_DIST_DEFAULT ? nextDist : null,
    });
  };
  const toggleLevel = (l: SchoolLevelKey, on: boolean) => write(LEVELS.map((x) => x.value).filter((v) => (v === l ? on : levels.includes(v))), owners, dist);
  const toggleOwner = (o: "public" | "private", on: boolean) => write(levels, OWNERS.map((x) => x.value).filter((v) => (v === o ? on : owners.includes(v))), dist);

  const label = levels.length ? `학교 · ${levels.map((l) => LEVELS.find((x) => x.value === l)!.short).join("")} ${dist >= 1000 ? `${dist / 1000}km` : `${dist}m`}` : "학교";

  return (
    <FilterMenu label={label} active={levels.length > 0} icon={GraduationCap} width="" panelWidth={330} heading="학교 근처 단지만 보기" buttonClassName={buttonClassName}>
      <Check label="전체 선택" strong checked={levels.length === LEVELS.length} onChange={(on) => write(on ? LEVELS.map((x) => x.value) : [], owners, dist)} />
      <div className="mt-1 grid grid-cols-2 gap-x-4">
        <fieldset>
          <legend className="sr-only">학교급</legend>
          {LEVELS.map((l) => (
            <Check key={l.value} label={l.label} checked={levels.includes(l.value)} onChange={(on) => toggleLevel(l.value, on)} />
          ))}
        </fieldset>
        <fieldset>
          <legend className="sr-only">설립</legend>
          {OWNERS.map((o) => (
            <Check key={o.value} label={o.label} checked={owners.includes(o.value)} disabled={owners.length === 1 && owners[0] === o.value} onChange={(on) => toggleOwner(o.value, on)} />
          ))}
        </fieldset>
      </div>

      <label htmlFor="school-dist" className="mt-4 block text-[15px] font-bold">
        학교까지 거리
      </label>
      <select
        id="school-dist"
        value={dist}
        disabled={!levels.length}
        aria-describedby={levels.length ? undefined : "school-dist-hint"}
        onChange={(e) => write(levels, owners, Number(e.target.value))}
        className="mt-1.5 h-11 w-full rounded-lg border-[1.5px] border-muted/60 px-2 text-[16px] focus:border-brand focus:outline-none disabled:bg-band disabled:text-muted"
      >
        {SCHOOL_DISTANCES.map((d) => (
          <option key={d} value={d}>
            {d >= 1000 ? `${d / 1000}km` : `${d}m`} 이내
          </option>
        ))}
      </select>
      {!levels.length && (
        <p id="school-dist-hint" className="mt-1 text-[13px] text-muted">
          학교급을 먼저 골라 주세요.
        </p>
      )}

      <p className="mt-3 text-[13px] leading-snug text-muted">
        고른 학교 중 하나라도 거리 안에 있는 단지만 지도와 목록에 보여요. 단지와 학교 위치 사이의 직선 거리라 실제 통학 거리와는 달라요.
      </p>
      {levels.length > 0 && (
        <button type="button" onClick={() => write([], ["public", "private"], SCHOOL_DIST_DEFAULT)} className="mt-3 text-[15px] font-bold text-brand hover:underline">
          초기화
        </button>
      )}
      <p className="mt-3 border-t border-line pt-2 text-[12px] text-muted">학교 위치: 전국초중등학교위치표준데이터 (한국교육시설안전원)</p>
    </FilterMenu>
  );
}
