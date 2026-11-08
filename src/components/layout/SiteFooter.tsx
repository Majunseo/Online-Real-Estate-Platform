import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Smartphone } from "lucide-react";
import { clsx } from "clsx";
import type { DataInfo } from "@shared/types";
import { useJson } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { FOOTER_GROUPS, FOOTER_LINKS, SITE, type FooterGroup } from "@/config/site";

/** "2026-08" … "2026-10" → "2026년 8~10월" */
function monthRange(months: string[]): string {
  if (!months.length) return "";
  const [y1, m1] = months[0].split("-").map(Number);
  const [y2, m2] = months[months.length - 1].split("-").map(Number);
  if (months.length === 1) return `${y1}년 ${m1}월`;
  return y1 === y2 ? `${y1}년 ${m1}~${m2}월` : `${y1}년 ${m1}월~${y2}년 ${m2}월`;
}

/** 자료 기준 줄: 받아 온 날짜 · 계약 기간 · 시군구 수. 서버에서 한 번 받는다 */
function DataBasis() {
  const { data } = useJson<DataInfo>("/api/data-info");
  if (!data?.fetchedAt) return null;
  const date = formatDate(data.fetchedAt.slice(0, 10));
  return (
    <p>
      자료 기준 <strong>{date}</strong> 수집 · {monthRange(data.months)} 계약분 · {data.sggCount}개 시군구. 계약 뒤 30일 안에 신고되므로 최근 거래는 늦게 보일 수 있어요.
    </p>
  );
}

function Group({ group }: { group: FooterGroup }) {
  const [open, setOpen] = useState(false);
  // id 에 빈칸이 있으면 aria-controls 가 두 개의 id 로 읽힌다
  const id = `footer-${group.title.replace(/\s+/g, "-")}`;
  return (
    <div className="flex-1 px-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="mx-auto flex items-center gap-2 py-3 text-[21px] text-ink"
      >
        {group.title}
        <ChevronDown className={clsx("h-6 w-6 text-brand transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      {open && (
        <ul id={id} className={clsx("mt-1 pb-2 text-center", group.twoColumns ? "grid grid-cols-2 gap-x-2 gap-y-2" : "space-y-2")}>
          {group.links.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="text-[16px] text-muted hover:text-brand hover:underline">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** 바닥글: 추천 기준 안내 → 펼치는 묶음 → 링크 줄 → 고지 → 앱 안내 */
export function SiteFooter() {
  return (
    <footer className="mx-auto max-w-page px-6 pb-12 pt-10 lg:px-24">
      <section className="text-center">
        <h2 className="text-[22px] font-bold">{SITE.name} 추천 기준 안내</h2>
        <p className="mx-auto mt-2 max-w-5xl text-[19px] leading-relaxed text-muted">
          첫 화면 추천 단지는 위치 사용을 허용하면 내 위치에서 가까운 단지를, 허용하지 않으면 최근 30일 거래가 많은 단지를 보여 드려요. 아래쪽 지역 단지는 최근 본 단지가 있는 지역(본 적이 없으면 거래가 가장 많은 지역)에서 골라요. 카드 표시 기준은 시세 산정 방식에 있어요.
        </p>
      </section>

      <div className="mt-10 flex flex-col divide-y divide-line border-b border-line pb-8 md:flex-row md:divide-x md:divide-y-0">
        {FOOTER_GROUPS.map((g) => (
          <Group key={g.title} group={g} />
        ))}
      </div>

      <nav aria-label="사이트 정보" className="border-b border-line py-8">
        <ul className="flex flex-wrap justify-center gap-x-7 gap-y-3 text-[19px]">
          {FOOTER_LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="text-ink hover:text-brand">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mx-auto mt-8 max-w-4xl space-y-2 text-center text-sm leading-relaxed text-muted">
        <p>
          {SITE.name}는 아파트 실거래가를 보여 주는 <strong>웹 테스트용 사이트</strong>입니다. 실거래 정보의 출처는 국토교통부 실거래가 공개 자료(공공데이터포털)입니다.
        </p>
        <p>단지 · 가격 · 거래는 실제 공공데이터이며 일부 시군구만 모아 두었습니다. 중개사무소 목록은 화면 확인용 가상 자료입니다.</p>
        <DataBasis />
        <p>© 2026 {SITE.name}</p>
      </div>

      <div className="mt-6 flex justify-center gap-3">
        {["App Store", "Google Play"].map((store) => (
          <span key={store} className="inline-flex items-center gap-2 rounded-lg border border-ink px-4 py-2 text-sm font-semibold" aria-label={`${store} 앱 준비 중`}>
            <Smartphone className="h-4 w-4" aria-hidden="true" /> {store} · 준비 중
          </span>
        ))}
      </div>
    </footer>
  );
}
