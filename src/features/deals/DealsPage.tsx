import { Link, useSearchParams } from "react-router-dom";
import { clsx } from "clsx";
import type { DealFilter, DealPeriod, DealSort, DealsResult } from "@shared/types";
import { useJson } from "@/lib/api";
import { formatDate, formatManwon, toPyeong } from "@/lib/format";
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

/**
 * 실거래가 목록. 조건은 주소에 둔다: ?sido=&sgg=&filter=record|canceled&period=month&sort=price-desc&page=
 * (바닥글 "이번 달 실거래 · 최고가 경신 거래 · 계약 해제 거래" 링크가 이 조건으로 들어온다)
 */
export function DealsPage() {
  const [params, setParams] = useSearchParams();
  const sido = params.get("sido") ?? "";
  const sgg = params.get("sgg") ?? "";
  const filter = (FILTERS.find((f) => f.value === params.get("filter"))?.value ?? "all") as DealFilter;
  const period = (PERIODS.find((p) => p.value === params.get("period"))?.value ?? "all") as DealPeriod;
  const sort = (SORTS.find((s) => s.value === params.get("sort"))?.value ?? "recent") as DealSort;
  const page = Number(params.get("page")) || 1;

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v && v !== "all" && v !== "recent" ? next.set(k, v) : next.delete(k));
    if (!("page" in patch)) next.delete("page");
    setParams(next);
  };

  const { data, loading, error } = useJson<DealsResult>(`/api/deals?${new URLSearchParams({ sido, sgg, filter, period, sort, page: String(page) })}`);
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const place = [data?.region.sido?.name, data?.region.sgg?.name].filter(Boolean).join(" ") || "전국";

  return (
    <Page title="실거래가" description="국토교통부에 신고된 아파트 매매 실거래가를 최근 계약순이나 가격 높은 순으로 보여 드려요.">
      <div className="flex flex-wrap items-center gap-3">
        <RegionSelect sido={sido} sgg={sgg} onChange={(s, g) => set({ sido: s, sgg: g })} />
        <Segmented label="거래 종류" options={FILTERS} value={filter} onChange={(v) => set({ filter: v })} />
        <Segmented label="기간" options={PERIODS} value={period} onChange={(v) => set({ period: v })} />
        <Segmented label="정렬" options={SORTS} value={sort} onChange={(v) => set({ sort: v })} />
      </div>

      <p className="mt-6 text-[17px]" aria-live="polite">
        {loading ? "불러오는 중…" : data && `${place} · ${FILTERS.find((f) => f.value === filter)!.label} · ${data.total.toLocaleString("ko-KR")}건 · ${SORTS.find((s) => s.value === sort)!.label}`}
        {data && period === "month" && <span className="text-muted"> (기준: {formatDate(data.newestDate)}까지 30일)</span>}
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-tag/10 px-4 py-3 text-tag">
          실거래가를 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}

      {data && data.items.length > 0 && (
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[720px] text-left text-[15px]">
            <caption className="sr-only">
              {place} 실거래가 {page}쪽
            </caption>
            <thead className="bg-band text-[14px] text-muted">
              <tr>
                {["계약일", "단지", "위치", "전용면적", "층", "가격", "구분"].map((h) => (
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
                  <td className="whitespace-nowrap px-3 py-2.5">
                    {r.deal.canceled ? <span className="text-tag">계약 해제</span> : r.record ? <span className="font-bold text-tag">최고가 경신</span> : r.deal.dealingType}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && data.items.length === 0 && <p className="mt-6 rounded-xl bg-band px-5 py-10 text-center text-muted">조건에 맞는 거래가 없어요.</p>}
      {data && <Pager page={data.page} pages={pages} onPage={(p) => set({ page: String(p) })} />}

      <p className="mt-10 border-t border-line pt-4 text-[13px] text-muted">
        최고가 경신: 같은 단지 · 같은 면적에서 먼저 계약된 거래(2건 이상) 모두보다 높게 거래된 경우예요. 자료가 최근 3개월치라 역대 최고가(신고가)와는 다를 수 있어요. 가격 높은 순에서 계약 해제된 거래는 맨 뒤에 보여요. 수집 지역은 일부 시군구예요.
      </p>
    </Page>
  );
}

function Segmented<T extends string>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl border-[1.5px] border-muted/60 p-1">
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
