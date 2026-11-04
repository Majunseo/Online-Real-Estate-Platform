import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Calculator, GraduationCap, MapPinOff, TrainFront } from "lucide-react";
import { clsx } from "clsx";
import type { BuildingInfo, Complex, ComplexDetail, Deal } from "@shared/types";
import { STATION_RADIUS_M } from "@shared/filters";
import { postJson, useJson } from "@/lib/api";
import { rememberView } from "@/lib/recentViews";
import { formatDate, formatManwon, toPyeong } from "@/lib/format";
import { ComplexCard } from "@/components/listing/ComplexCard";
import { ComplexThumb } from "@/components/listing/ComplexThumb";
import { MiniMap } from "@/components/map/MiniMap";
import { Notice } from "@/components/page/Page";
import { useAuth } from "@/features/auth/AuthProvider";
import { FavoriteButton } from "@/features/favorites/FavoriteButton";
import { PriceChart } from "./PriceChart";
import { StreetViewScreen } from "./StreetViewScreen";

const sameArea = (d: Deal, area: number) => Math.round(d.areaM2) === area;

/** 단지 상세: 기본 정보 · 면적별 가격 흐름 · 거래 내역 · 위치 · 같은 동네 다른 단지 */
export function ComplexPage() {
  const { id = "" } = useParams();
  const { data, loading, error } = useJson<ComplexDetail>(`/api/complexes/${encodeURIComponent(id)}`);
  const [area, setArea] = useState<number | null>(null);
  // 열어 본 단지를 기억해 두면 첫 화면 지역 추천이 그 단지 기준으로 바뀐다 (있는 단지일 때만).
  // 회원은 계정에, 로그인 전에는 이 브라우저에만 남긴다
  const { user } = useAuth();
  const viewedId = data?.complex.id;
  useEffect(() => {
    if (!viewedId || user === undefined) return;
    if (user) postJson("/api/recent-views", { complexId: viewedId }).catch(() => {});
    else rememberView(viewedId);
  }, [viewedId, user]);

  // 거리뷰 화면은 주소(?view=street)에 둔다: 새로 고침 · 링크 공유 · 브라우저 뒤로 가기가 그대로 된다
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const street = params.get("view") === "street";
  const openStreet = () => navigate({ search: "?view=street" }, { state: { fromDetail: true } });
  const closeStreet = (to: "top" | "map") => {
    // 상세에서 열었으면 기록을 하나 되돌리고(뒤로 가기와 같게), 거리뷰 주소로 바로 들어왔으면 주소만 바꾼다
    if ((location.state as { fromDetail?: boolean } | null)?.fromDetail) navigate(-1);
    else setParams({}, { replace: true });
    setTimeout(() => (to === "map" ? document.getElementById("map-title")?.scrollIntoView({ block: "start" }) : window.scrollTo(0, 0)), 50);
  };

  if (loading) return <p className="py-24 text-center text-muted">단지 정보를 불러오는 중…</p>;
  if (error || !data)
    return (
      <div className="mx-auto max-w-[720px] px-5 py-16">
        <Notice icon={MapPinOff} title="단지를 찾을 수 없어요">
          주소가 바뀌었거나 실거래가 자료에 없는 단지예요.{" "}
          <Link to="/search" className="font-bold text-brand hover:underline">
            지도에서 찾기
          </Link>
        </Notice>
      </div>
    );

  const { complex: c, deals, areas, nearby, roadAddress } = data;
  // 다른 단지로 넘어가면 그 단지에 없는 면적은 버리고 최근 거래 면적으로
  const current = area !== null && areas.includes(area) ? area : Math.round(c.latest.areaM2);
  const areaDeals = deals.filter((d) => sameArea(d, current));
  const valid = deals.filter((d) => !d.canceled);
  const address = `${c.sido} ${c.sgg} ${c.umd} ${c.jibun}`;

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-8 sm:px-8">
      <nav aria-label="위치" className="text-[15px] text-muted">
        <Link to={`/search?sido=${c.sggCode.slice(0, 2)}`} className="hover:underline">
          {c.sido}
        </Link>
        {" › "}
        <Link to={`/search?sgg=${c.sggCode}`} className="hover:underline">
          {c.sgg}
        </Link>
        {c.dongCode && (
          <>
            {" › "}
            <Link to={`/search?dong=${c.dongCode}`} className="hover:underline">
              {c.dong}
            </Link>
          </>
        )}
      </nav>

      <header className="mt-3 grid gap-6 md:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-[32px] font-extrabold tracking-tight">{c.name}</h1>
              <p className="mt-1 text-[17px] text-muted">
                {address}
                {roadAddress && ` · ${c.sido} ${c.sgg} ${roadAddress}`}
              </p>
              <NearStationLine c={c} />
              <NearSchoolsLine c={c} />
            </div>
            <FavoriteButton complexId={c.id} name={c.name} variant="inline" />
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["최근 실거래가", formatManwon(c.latest.amount)],
              ["최근 계약일", formatDate(c.latest.date)],
              ["기간 내 거래", `${valid.length}건`],
              ["준공", `${c.buildYear}년`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl bg-band px-4 py-3">
                <dt className="text-[14px] text-muted">{k}</dt>
                <dd className="mt-0.5 text-[20px] font-extrabold">{v}</dd>
              </div>
            ))}
          </dl>
          {c.building && <BuildingFacts b={c.building} />}
          <Link to={`/loan?price=${c.latest.amount}`} className="btn-outline mt-5 inline-flex">
            <Calculator className="h-5 w-5" aria-hidden="true" />이 가격으로 대출 계산하기
          </Link>
        </div>
        <div className="overflow-hidden rounded-xl">
          <ComplexThumb id={c.id} />
        </div>
      </header>

      <section aria-labelledby="price-title" className="mt-10">
        <h2 id="price-title" className="section-title">
          면적별 실거래가
        </h2>
        <div role="tablist" aria-label="전용면적" className="mt-4 flex flex-wrap gap-2">
          {areas.map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              aria-selected={a === current}
              onClick={() => setArea(a)}
              className={clsx("rounded-full border-[1.5px] px-4 py-1.5 text-[16px] font-bold", a === current ? "border-brand bg-brand text-white" : "border-muted/60 hover:bg-band")}
            >
              {a}㎡ ({toPyeong(a)}평)
            </button>
          ))}
        </div>
        <div role="tabpanel" className="mt-4 grid gap-6 lg:grid-cols-[1fr_420px]">
          <div className="rounded-xl border border-line p-4">
            <PriceChart deals={areaDeals} title={`${c.name} 전용 ${current}㎡`} />
          </div>
          <div className="max-h-[320px] overflow-auto rounded-xl border border-line">
            <table className="w-full text-left text-[15px]">
              <caption className="sr-only">전용 {current}㎡ 거래 내역</caption>
              <thead className="sticky top-0 bg-band text-[14px] text-muted">
                <tr>
                  <th className="px-3 py-2 font-semibold">계약일</th>
                  <th className="px-3 py-2 font-semibold">가격</th>
                  <th className="px-3 py-2 font-semibold">층</th>
                  <th className="px-3 py-2 font-semibold">구분</th>
                </tr>
              </thead>
              <tbody>
                {areaDeals.map((d, i) => (
                  <tr key={i} className={clsx("border-t border-line", d.canceled && "text-muted line-through")}>
                    <td className="px-3 py-2">{formatDate(d.date)}</td>
                    <td className="px-3 py-2 font-bold">{formatManwon(d.amount)}</td>
                    <td className="px-3 py-2">{d.floor}층</td>
                    <td className="px-3 py-2 no-underline">{d.canceled ? "계약 해제" : d.dealingType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section aria-labelledby="map-title" className="mt-10">
        <h2 id="map-title" className="section-title">
          위치
        </h2>
        <MiniMap lat={c.lat} lng={c.lng} label={`${c.name} (${address})`} className="mt-4 h-[300px]" onStreetView={openStreet} />
      </section>

      {nearby.length > 0 && (
        <section aria-labelledby="nearby-title" className="mt-10">
          <h2 id="nearby-title" className="section-title">
            {c.sgg}의 다른 단지
          </h2>
          <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nearby.map((n) => (
              <li key={n.id}>
                <ComplexCard c={n} className="w-full" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-10 border-t border-line pt-4 text-[13px] text-muted">국토교통부 아파트 매매 실거래가 공개 자료 기준이에요. 사진은 단지를 구분하기 위한 그림이에요.</p>

      {street && <StreetViewScreen complex={c} onBackToListing={() => closeStreet("top")} onBackToMap={() => closeStreet("map")} />}
    </div>
  );
}

/**
 * 단지 정보 (건축물대장 표제부): 세대수 · 동수 · 최고층 · 사용승인일 · 승강기.
 * 같은 필지에 여러 단지가 있으면(예: 1~4단지) 표제부가 필지 전체라 세대수 · 동수도 전체 합이다.
 * 주차 대수는 표제부에 대부분 비어 있어(0) 값이 있을 때만 보여 준다.
 */
/** 가장 가까운 지하철역. 역 중심까지 직선 거리라 실제 걷는 거리와 다를 수 있다 */
function NearStationLine({ c }: { c: Complex }) {
  const s = c.station;
  return (
    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[16px]">
      <TrainFront className="h-4 w-4 text-muted" aria-hidden="true" />
      {s ? (
        <>
          <span>
            가까운 역 <b>{s.name}역</b> <span className="text-muted">({s.lines.join(" · ")})</span> · 직선 {s.distanceM.toLocaleString("ko-KR")}m
          </span>
          {s.distanceM <= STATION_RADIUS_M && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[13px] font-bold text-brand-strong">역세권</span>}
        </>
      ) : (
        <span className="text-muted">1km 안에 지하철역이 없어요</span>
      )}
    </p>
  );
}

const SCHOOL_LEVELS = [
  { level: "e", label: "초" },
  { level: "m", label: "중" },
  { level: "h", label: "고" },
] as const;

/** 학교급별 가장 가까운 학교 (국공립 · 사립 중 더 가까운 곳). 1km 안에 없으면 그 학교급은 "-" */
function NearSchoolsLine({ c }: { c: Complex }) {
  const nearest = SCHOOL_LEVELS.map(({ level, label }) => ({ label, s: c.schools?.find((x) => x.level === level) }));
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[16px]">
      <GraduationCap className="h-4 w-4 text-muted" aria-hidden="true" />
      <span className="sr-only">가까운 학교 (직선 1km 안)</span>
      {nearest.map(({ label, s }) => (
        <span key={label}>
          <span className="text-muted">{label}</span>{" "}
          {s ? (
            <>
              <b>{s.name}</b> {s.distanceM.toLocaleString("ko-KR")}m{s.owner === "private" && <span className="text-muted"> (사립)</span>}
            </>
          ) : (
            <span className="text-muted">1km 안에 없음</span>
          )}
        </span>
      ))}
    </p>
  );
}

function BuildingFacts({ b }: { b: BuildingInfo }) {
  const facts = [
    ["세대수", `${b.households.toLocaleString("ko-KR")}세대`],
    ["동수", `${b.dongs}개 동`],
    ["최고층", `${b.maxFloor}층`],
    ["사용승인", b.approvedAt ? formatDate(b.approvedAt) : "-"],
    ...(b.elevators ? [["승강기", `${b.elevators}대`]] : []),
    ...(b.parking ? [["주차", `${b.parking.toLocaleString("ko-KR")}대 (세대당 ${(b.parking / b.households).toFixed(1)})`]] : []),
  ];
  return (
    <section aria-labelledby="building-title" className="mt-4">
      <h2 id="building-title" className="text-[15px] font-bold text-muted">
        단지 정보 <span className="font-normal">· 건축물대장</span>
      </h2>
      <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 rounded-xl border border-line px-4 py-3 sm:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 text-[15px]">
            <dt className="text-muted">{k}</dt>
            <dd className="font-bold">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
