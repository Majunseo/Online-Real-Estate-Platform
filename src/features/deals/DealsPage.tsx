import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { clsx } from "clsx";
import type { DealFilter, DealPeriod, DealSort, DealsResult } from "@shared/types";
import { useJson } from "@/lib/api";
import { formatDate, formatManwon, perPyeong, toPyeong } from "@/lib/format";
import { RegionSelect } from "@/components/form/RegionSelect";
import { Page, Pager } from "@/components/page/Page";

const FILTERS: { value: DealFilter; label: string }[] = [
  { value: "all", label: "전체 거래" },
  { value: "record", label: "최고가 경신" },
  { value: "canceled", label: "계약 해제" },
];
const PERIODS: { value: DealPeriod; label: string }[] = [
  { value: "all", label: "전체 기간" },
  { value: "month", label: "최근 한 달" },
];
const SORTS: { value: DealSort; label: string }[] = [
  { value: "recent", label: "최근 계약순" },
  { value: "price-desc", label: "가격 높은 순" },
];
/** 전용면적 구간 (㎡). 소형 · 국민평형(85) · 중형 · 중대형 · 대형 경계 */
const AREAS: { value: string; label: string; min: number | null; max: number | null }[] = [
  { value: "all", label: "전체 면적", min: null, max: null },
  { value: "s", label: "60㎡ 이하", min: null, max: 60 },
  { value: "m", label: "60~85㎡", min: 61, max: 85 },
  { value: "l", label: "85~102㎡", min: 86, max: 102 },
  { value: "xl", label: "102~135㎡", min: 103, max: 135 },
  { value: "xxl", label: "135㎡ 넘음", min: 136, max: null },
];

/**
 * 실거래가 목록. 조건은 주소에 둔다: ?sido=&sgg=&q=&areaMin=&areaMax=&filter=record|canceled&period=month&sort=price-desc&page=
 * (바닥글 "이번 달 실거래 · 최고가 경신 거래 · 계약 해제 거래" 링크가 이 조건으로 들어온다)
 */
export function DealsPage() {
  const [params, setParams] = useSearchParams();
  const sido = params.get("sido") ?? "";
  const sgg = params.get("sgg") ?? "";
  const q = params.get("q")?.trim() ?? "";
  const areaMin = params.get("areaMin") ?? "";
  const areaMax = params.get("areaMax") ?? "";
  const filter = (FILTERS.find((f) => f.value === params.get("filter"))?.value ?? "all") as DealFilter;
  const period = (PERIODS.find((p) => p.value === params.get("period"))?.value ?? "all") as DealPeriod;
  const sort = (SORTS.find((s) => s.value === params.get("sort"))?.value ?? "recent") as DealSort;
  const page = Number(params.get("page")) || 1;
  const areaValue = AREAS.find((a) => String(a.min ?? "") === areaMin && String(a.max ?? "") === areaMax)?.value ?? "all";

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v && v !== "all" && v !== "recent" ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };

  const { data, loading, error } = useJson<DealsResult>(`/api/deals?${new URLSearchParams({ sido, sgg, q, areaMin, areaMax, filter, period, sort, page: String(page) })}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const place = [data?.region.sido?.name, data?.region.sgg?.name].filter(Boolean).join(" ") || "전국";
  const areaLabel = AREAS.find((a) => a.value === areaValue)!.label;

  return (
    <Page title="실거래가" description="국토교통부에 신고된 아파트 매매 실거래가를 최근 계약순이나 가격 높은 순으로 보여 드려요.">
      <div className="flex flex-wrap items-center gap-3">
        <RegionSelect sido={sido} sgg={sgg} onChange={(s, g) => set({ sido: s, sgg: g })} />
        <KeywordSearch q={q} onSubmit={(text) => set({ q: text })} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Segmented label="거래 종류" options={FILTERS} value={filter} onChange={(v) => set({ filter: v })} />
        <Segmented label="기간" options={PERIODS} value={period} onChange={(v) => set({ period: v })} />
        <Segmented label="정렬" options={SORTS} value={sort} onChange={(v) => set({ sort: v })} />
        <Segmented
          label="전용면적"
          options={AREAS.map((a) => ({ value: a.value, label: a.label }))}
          value={areaValue}
          onChange={(v) => {
            const a = AREAS.find((x) => x.value === v)!;
            set({ areaMin: a.min === null ? "" : String(a.min), areaMax: a.max === null ? "" : String(a.max) });
          }}
        />
      </div>

      <p className="mt-6 text-[17px]" aria-live="polite">
        {loading
          ? "불러오는 중…"
          : data &&
            [place, q && `"${q}"`, areaValue !== "all" && areaLabel, FILTERS.find((f) => f.value === filter)!.label, `${data.total.toLocaleString("ko-KR")}건`, SORTS.find((s) => s.value === sort)!.label]
              .filter(Boolean)
              .join(" · ")}
        {data && period === "month" && <span className="text-muted"> (기준: {formatDate(data.newestDate)}까지 30일)</span>}
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-tag/10 px-4 py-3 text-tag">
          실거래가를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[800px] text-left text-[15px]">
            <caption className="sr-only">
              {place} 실거래가 {page}쪽
            </caption>
            <thead className="bg-band text-[14px] text-muted">
              <tr>
                {["계약일", "단지", "위치", "전용면적", "층", "가격", "평당", "구분"].map((h) => (
                  <th key={h} scope="col" className="px-3 py-2.5 font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((r, i) => (
                <tr key={`${r.complexId}-${i}`} className="border-t border-line">
                  <td className="whitespace-nowrap px-3 py-2.5">{formatDate(r.deal.date)}</td>
                  <td className="px-3 py-2.5">
                    <Link to={`/complex/${r.complexId}`} className="font-bold text-brand hover:underline">
                      {r.complexName}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-muted">
                    {r.sido} {r.sgg} {r.umd}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {Math.round(r.deal.areaM2)}㎡ ({toPyeong(r.deal.areaM2)}평)
                  </td>
                  <td className="px-3 py-2.5">{r.deal.floor}층</td>
                  <td className={clsx("whitespace-nowrap px-3 py-2.5 font-bold", r.deal.canceled && "text-muted line-through")}>{formatManwon(r.deal.amount)}</td>
                  <td className={clsx("whitespace-nowrap px-3 py-2.5 text-muted", r.deal.canceled && "line-through")}>{formatManwon(perPyeong(r.deal.amount, r.deal.areaM2) ?? 0)}</td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {r.deal.canceled ? <span className="text-tag">계약 해제</span> : r.record ? <span className="font-bold text-tag">최고가 경신</span> : r.deal.dealingType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.items.length === 0 && (
        <p className="mt-6 rounded-xl bg-band px-5 py-10 text-center text-muted">
          조건에 맞는 거래가 없어요.
          {(q || areaValue !== "all") && (
            <>
              {" "}
              <button type="button" onClick={() => set({ q: "", areaMin: "", areaMax: "" })} className="font-bold text-brand hover:underline">
                검색어 · 면적 조건 지우기
              </button>
            </>
          )}
        </p>
      )}
      {data && <Pager page={data.page} pages={pages} onPage={(p) => set({ page: String(p) })} />}

      <p className="mt-10 border-t border-line pt-4 text-[13px] text-muted">
        최고가 경신: 같은 단지 · 같은 면적에서 먼저 계약된 거래(2건 이상) 모두보다 높게 거래된 경우예요. 자료가 최근 3개월치라 역대 최고가(신고가)와는 다를 수 있어요. 가격 높은 순에서 계약 해제된 거래는 맨 뒤에 보여요.
        평당 가격은 매매가를 전용면적(평)으로 나눈 값이에요. 수집 지역은 일부 시군구예요.
      </p>
    </Page>
  );
}

/** 단지 · 동 이름 검색. Enter 나 돋보기로 적용하고, ✕ 로 지운다 */
function KeywordSearch({ q, onSubmit }: { q: string; onSubmit: (text: string) => void }) {
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(text.trim());
  };
  return (
    <form onSubmit={submit} role="search" className="flex h-12 w-full max-w-[360px] items-center rounded-xl border-[1.5px] border-muted/60 pl-4 pr-1 focus-within:border-brand">
      <label htmlFor="deals-q" className="sr-only">
        단지 · 동 이름 검색
      </label>
      <input id="deals-q" value={text} onChange={(e) => setText(e.target.value)} placeholder="단지 · 동 이름" autoComplete="off" className="h-full min-w-0 flex-1 bg-transparent text-[17px] placeholder:text-muted/70 focus:outline-none" />
      {text && (
        <button
          type="button"
          aria-label="검색어 지우기"
          onClick={() => {
            setText("");
            if (q) onSubmit("");
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-band"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
      <button type="submit" aria-label="검색" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-band">
        <Search className="h-5 w-5" strokeWidth={2.6} aria-hidden="true" />
      </button>
    </form>
  );
}

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap rounded-xl border-[1.5px] border-muted/60 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={clsx("rounded-lg px-3.5 py-1.5 text-[15px] font-bold", o.value === value ? "bg-brand text-white" : "text-ink hover:bg-band")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
