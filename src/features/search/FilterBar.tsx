import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { activeCount, EMPTY_FILTER, STATION_RADIUS_M, type BadgeFilter, type Dealing, type ListFilter, type Period } from "@shared/filters";
import { formatManwon } from "@/lib/format";
import { postJson } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { FilterMenu, MenuChoices, MenuSelect } from "./FilterMenu";

const PRICE_STEPS = [10_000, 20_000, 30_000, 50_000, 70_000, 100_000, 150_000, 200_000, 300_000]; // 만원
const AREA_STEPS = [40, 60, 85, 102, 135]; // 전용 ㎡ (소형 · 국민평형 · 중대형 경계)
const THIS_YEAR = new Date().getFullYear();
const BUILT: { value: string; label: string; min: number | null; max: number | null }[] = [
  { value: "all", label: "전체", min: null, max: null },
  { value: "5", label: "5년 이내", min: THIS_YEAR - 5, max: null },
  { value: "10", label: "10년 이내", min: THIS_YEAR - 10, max: null },
  { value: "20", label: "20년 이내", min: THIS_YEAR - 20, max: null },
  { value: "old", label: "20년 넘음", min: null, max: THIS_YEAR - 21 },
];
const PERIODS: { value: Period; label: string }[] = [
  { value: "all", label: "전체 기간" },
  { value: "month", label: "최근 한 달" },
  { value: "week", label: "최근 일주일" },
];

const eok = (v: number) => formatManwon(v);
const pyeong = (m2: number) => Math.round(m2 / 3.3058);
const range = (min: string | null, max: string | null, unit = "") => (min && max ? `${min}~${max}${unit}` : min ? `${min}${unit} 이상` : max ? `${max}${unit} 이하` : "");
const priceRange = (l: ListFilter) => range(l.priceMin !== null ? eok(l.priceMin) : null, l.priceMax !== null ? eok(l.priceMax) : null);
const areaRange = (l: ListFilter) => range(l.areaMin !== null ? String(l.areaMin) : null, l.areaMax !== null ? String(l.areaMax) : null, "㎡");

interface Props {
  q: string;
  placeholder: string;
  onSubmit: (text: string) => void;
  list: ListFilter;
  onList: (list: ListFilter) => void;
  /** 검색 저장에 붙일 이름 (예: "서울 마포구") */
  place: string;
}

/** 지도 위 한 줄: 검색창 · 매매 · 가격 · 면적 · 준공 연도 · 필터 · 검색 저장. 조건은 고르는 즉시 적용된다 */
export function FilterBar({ q, placeholder, onSubmit, list, onList, place }: Props) {
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  const set = (patch: Partial<ListFilter>) => onList({ ...list, ...patch });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(text);
  };

  const builtValue = BUILT.find((b) => b.min === list.builtMin && b.max === list.builtMax)?.value ?? "all";
  const more = (list.dealing !== "all" ? 1 : 0) + (list.badge ? 1 : 0) + (list.householdsMin !== null ? 1 : 0) + (list.near ? 1 : 0);
  const priceLabel = priceRange(list);
  const areaLabel = areaRange(list);
  const priceOptions = [{ value: "", label: "제한 없음" }, ...PRICE_STEPS.map((v) => ({ value: String(v), label: eok(v) }))];
  const areaOptions = [{ value: "", label: "제한 없음" }, ...AREA_STEPS.map((v) => ({ value: String(v), label: `${v}㎡ (${pyeong(v)}평)` }))];

  return (
    <div className="flex shrink-0 items-center gap-3 overflow-x-auto border-b border-line bg-surface px-4 py-2">
      <form onSubmit={submit} role="search" className="flex h-[54px] w-full min-w-[240px] max-w-[400px] shrink-0 items-center rounded-lg border-[1.5px] border-muted/60 pl-5 pr-2 focus-within:border-brand">
        <label htmlFor="search-q" className="sr-only">
          지역 · 단지 검색
        </label>
        <input id="search-q" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-[18px] placeholder:text-muted/70 focus:outline-none" />
        <button type="submit" aria-label="검색" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-band">
          <Search className="h-6 w-6" strokeWidth={2.6} aria-hidden="true" />
        </button>
      </form>

      <div className="hidden items-center gap-3 lg:flex">
        <FilterMenu label={list.period === "all" ? "매매" : `매매 · ${PERIODS.find((p) => p.value === list.period)!.label}`} active={list.period !== "all"} width="min-w-[110px]" panelWidth={300}>
          <MenuChoices label="거래 시기 (최근 실거래 기준)" value={list.period} options={PERIODS} onChange={(v) => set({ period: v })} />
          <p className="mt-3 text-[13px] text-muted">아파트 매매 실거래만 있어요. 전세 · 월세는 아직 없어요.</p>
        </FilterMenu>

        <FilterMenu label={priceLabel || "가격"} active={Boolean(priceLabel)} width="min-w-[110px]">
          <div className="flex gap-2">
            <MenuSelect id="price-min" label="최소" value={String(list.priceMin ?? "")} options={priceOptions} onChange={(v) => set({ priceMin: v ? Number(v) : null })} />
            <MenuSelect id="price-max" label="최대" value={String(list.priceMax ?? "")} options={priceOptions} onChange={(v) => set({ priceMax: v ? Number(v) : null })} />
          </div>
          {list.priceMin !== null && list.priceMax !== null && list.priceMin > list.priceMax && (
            <p role="alert" className="mt-2 text-[14px] text-tag">
              최소가 최대보다 커요. 결과가 없을 거예요.
            </p>
          )}
          <Reset onClick={() => set({ priceMin: null, priceMax: null })} />
        </FilterMenu>

        <FilterMenu label={areaLabel || "면적"} active={Boolean(areaLabel)} width="min-w-[110px]">
          <div className="flex gap-2">
            <MenuSelect id="area-min" label="최소 (전용)" value={String(list.areaMin ?? "")} options={areaOptions} onChange={(v) => set({ areaMin: v ? Number(v) : null })} />
            <MenuSelect id="area-max" label="최대 (전용)" value={String(list.areaMax ?? "")} options={areaOptions} onChange={(v) => set({ areaMax: v ? Number(v) : null })} />
          </div>
          <p className="mt-2 text-[13px] text-muted">전용 85㎡ ≈ 흔히 말하는 34평형</p>
          <Reset onClick={() => set({ areaMin: null, areaMax: null })} />
        </FilterMenu>

        <FilterMenu label={builtValue === "all" ? "준공 연도" : `준공 ${BUILT.find((b) => b.value === builtValue)!.label}`} active={builtValue !== "all"} width="min-w-[130px]" panelWidth={340}>
          <MenuChoices
            label="준공 연도"
            value={builtValue}
            options={BUILT.map((b) => ({ value: b.value, label: b.label }))}
            onChange={(v) => {
              const b = BUILT.find((x) => x.value === v)!;
              set({ builtMin: b.min, builtMax: b.max });
            }}
          />
        </FilterMenu>

        <FilterMenu label={more ? `필터 · ${more}` : "필터"} active={more > 0} icon={SlidersHorizontal} width="min-w-[110px]" panelWidth={340}>
          <div className="space-y-4">
            <MenuChoices<Dealing>
              label="거래 방식"
              value={list.dealing}
              options={[
                { value: "all", label: "전체" },
                { value: "중개거래", label: "중개거래" },
                { value: "직거래", label: "직거래" },
              ]}
              onChange={(v) => set({ dealing: v })}
            />
            <MenuChoices<"all" | NonNullable<BadgeFilter>>
              label="표시"
              value={list.badge ?? "all"}
              options={[
                { value: "all", label: "전체" },
                { value: "drop", label: "가격 하락" },
                { value: "record", label: "최고가 경신" },
                { value: "new", label: "새 거래" },
              ]}
              onChange={(v) => set({ badge: v === "all" ? null : v })}
            />
            <MenuChoices
              label="세대수 (건축물대장)"
              value={String(list.householdsMin ?? "all")}
              options={[
                { value: "all", label: "전체" },
                { value: "300", label: "300세대 이상" },
                { value: "500", label: "500세대 이상" },
                { value: "1000", label: "1,000세대 이상" },
              ]}
              onChange={(v) => set({ householdsMin: v === "all" ? null : Number(v) })}
            />
            <MenuChoices<"all" | "station">
              label={`역세권 (지하철역 ${STATION_RADIUS_M}m 안)`}
              value={list.near ?? "all"}
              options={[
                { value: "all", label: "전체" },
                { value: "station", label: "역세권만" },
              ]}
              onChange={(v) => set({ near: v === "all" ? null : v })}
            />
            <p className="text-[13px] leading-snug text-muted">역 중심까지 직선 거리 기준이라 실제 걷는 거리는 더 길 수 있어요.</p>
          </div>
          <Reset onClick={() => set({ dealing: "all", badge: null, householdsMin: null, near: null })} />
        </FilterMenu>

        {activeCount(list) > 0 && (
          <button type="button" onClick={() => onList(EMPTY_FILTER)} className="shrink-0 whitespace-nowrap px-2 text-[16px] font-bold text-brand hover:underline">
            조건 모두 지우기
          </button>
        )}
      </div>

      <SaveSearch place={place} q={q} list={list} />
    </div>
  );
}

function Reset({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-3 text-[15px] font-bold text-brand hover:underline">
      초기화
    </button>
  );
}

/** 검색 저장: 지금 주소(지역 · 검색어 · 조건)를 이름 붙여 저장한다. 로그인 전이면 로그인으로 보낸다 */
function SaveSearch({ place, q, list }: { place: string; q: string; list: ListFilter }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // 조건을 바꾸거나 로그인 상태가 바뀌면 "저장했어요"를 지운다
  useEffect(() => setState("idle"), [search, user]);

  const save = async () => {
    if (!user) return navigate(`/login?${new URLSearchParams({ next: pathname + search })}`);
    const name = [place || "전국", q && `"${q}"`, list.period !== "all" && PERIODS.find((p) => p.value === list.period)!.label, priceRange(list), areaRange(list)].filter(Boolean).join(" · ");
    setState("saving");
    try {
      await postJson("/api/saved-searches", { name, query: search.replace(/^\?/, "") });
      setState("saved");
    } catch {
      setState("error");
    }
  };

  return (
    <>
      <button type="button" onClick={save} disabled={state === "saving"} className="btn-primary hidden h-[54px] shrink-0 whitespace-nowrap px-6 text-[18px] sm:inline-flex">
        {state === "saved" ? "저장했어요" : state === "error" ? "다시 저장" : "검색 저장"}
      </button>
      <span role="status" className="sr-only">
        {state === "saved" ? "검색을 저장했어요. 관심 단지 화면에서 볼 수 있어요." : state === "error" ? "저장하지 못했어요." : ""}
      </span>
    </>
  );
}
