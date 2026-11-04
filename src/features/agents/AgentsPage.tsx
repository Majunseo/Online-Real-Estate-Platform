import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Phone, Search, UserRound } from "lucide-react";
import type { Agent, RegionPath } from "@shared/types";
import { useJson } from "@/lib/api";
import { RegionSelect } from "@/components/form/RegionSelect";
import { Page } from "@/components/page/Page";

/**
 * 중개사 찾기. 지역과 검색어(사무소 이름 · 동네 · 전문 분야)로 찾는다. 조건은 주소에: ?sido=&sgg=&q=
 * 사무소는 화면 확인용 가상 자료이고, "이 지역 중개거래"만 실거래가 스냅숏에서 센 실제 숫자다.
 */
export function AgentsPage() {
  const [params, setParams] = useSearchParams();
  const sido = params.get("sido") ?? "";
  const sgg = params.get("sgg") ?? "";
  const q = params.get("q") ?? "";
  const [text, setText] = useState(q);
  const { data, loading } = useJson<{ region: RegionPath; items: Agent[] }>(`/api/agents?${new URLSearchParams({ sido, sgg, q })}`);

  const update = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    update({ q: text.trim() });
  };

  return (
    <Page title="중개사 찾기" description="살고 싶은 지역의 공인중개사무소를 찾아 연락해 보세요.">
      <div className="flex flex-wrap items-center gap-3">
        <RegionSelect sido={sido} sgg={sgg} onChange={(s, g) => update({ sido: s, sgg: g })} />
        <form onSubmit={submit} role="search" className="flex h-12 min-w-[260px] flex-1 items-center rounded-xl border-[1.5px] border-muted/60 pl-4 pr-1 focus-within:border-brand">
          <label htmlFor="agent-q" className="sr-only">
            사무소 이름 · 동네 · 전문 분야
          </label>
          <input id="agent-q" value={text} onChange={(e) => setText(e.target.value)} placeholder="사무소 이름, 동네, 전문 분야" className="h-full min-w-0 flex-1 bg-transparent text-[17px] focus:outline-none" />
          <button type="submit" aria-label="검색" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-band">
            <Search className="h-5 w-5" aria-hidden="true" />
          </button>
        </form>
      </div>

      <p className="mt-6 text-[17px]" aria-live="polite">
        {loading ? "찾는 중…" : `${data?.items.length ?? 0}곳`}
      </p>
      <ul className="mt-3 grid gap-4 md:grid-cols-2">
        {data?.items.map((a) => (
          <li key={a.id} className="rounded-2xl border border-line p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[20px] font-bold">{a.name}</h2>
                <p className="mt-0.5 text-[15px] text-muted">{a.address}</p>
              </div>
              <span className="shrink-0 rounded-full bg-band px-3 py-1 text-[13px] text-muted">가상 사무소</span>
            </div>
            <p className="mt-3 flex items-center gap-2 text-[16px]">
              <UserRound className="h-4 w-4 text-muted" aria-hidden="true" />
              대표 {a.owner}
            </p>
            <p className="mt-1 flex items-center gap-2 text-[16px]">
              <Phone className="h-4 w-4 text-muted" aria-hidden="true" />
              {a.phone}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2" aria-label="전문 분야">
              {a.specialties.map((s) => (
                <li key={s} className="rounded-full bg-brand-soft px-3 py-1 text-[14px] font-bold text-brand">
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[14px] text-muted">
              {a.sgg} 아파트 중개거래 (최근 3개월): <b className="text-ink">{a.sggBrokeredDeals.toLocaleString("ko-KR")}건</b>
            </p>
          </li>
        ))}
      </ul>
      {data && data.items.length === 0 && <p className="mt-4 rounded-xl bg-band px-5 py-10 text-center text-muted">조건에 맞는 사무소가 없어요. 지역을 넓혀 보세요.</p>}
      <p className="mt-10 border-t border-line pt-4 text-[13px] text-muted">
        사무소 이름 · 대표 · 주소 · 전화번호는 화면 확인용 가상 자료예요. 지역별 중개거래 수는 국토교통부 실거래가 자료에서 셌어요.
      </p>
    </Page>
  );
}
