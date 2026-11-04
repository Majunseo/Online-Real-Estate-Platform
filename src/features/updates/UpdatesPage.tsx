import { Link } from "react-router-dom";
import { Bell, TrendingDown, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import type { UpdateItem } from "@shared/types";
import { useJson } from "@/lib/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { formatDate, formatManwon } from "@/lib/format";
import { Notice, Page } from "@/components/page/Page";

interface UpdatesResult {
  signedIn: boolean;
  personal: UpdateItem[];
  market: UpdateItem[];
}

/** 새 소식: 관심 단지의 최근 30일 거래(로그인했을 때)와 전국의 최근 일주일 가격 변동 */
export function UpdatesPage() {
  const { user } = useAuth();
  // 서버는 쿠키로 회원을 알지만, 이 화면에서 로그아웃하면 주소가 달라져 관심 단지 소식을 다시 받도록 넣어 둔다
  const { data, loading } = useJson<UpdatesResult>(user === undefined ? null : `/api/updates?as=${user ? user.id : "guest"}`);
  return (
    <Page title="새 소식" description="관심 단지에 새로 신고된 거래와 최근 눈에 띄는 가격 변동을 모아 봤어요.">
      {loading && <p className="py-16 text-center text-muted">불러오는 중…</p>}
      {data && (
        <div className="grid gap-10 lg:grid-cols-2">
          <section aria-labelledby="mine">
            <h2 id="mine" className="section-title">
              관심 단지 소식
            </h2>
            <div className="mt-4">
              {!data.signedIn ? (
                <Notice icon={Bell} title="로그인하면 관심 단지 소식을 받아요">
                  <Link to="/login?next=/updates" className="btn-primary mt-4 inline-flex">
                    로그인하기
                  </Link>
                </Notice>
              ) : data.personal.length ? (
                <Feed items={data.personal} />
              ) : (
                <Notice icon={Bell} title="최근 30일 동안 관심 단지에 새 거래가 없어요">
                  <Link to="/favorites" className="font-bold text-brand hover:underline">
                    관심 단지 관리
                  </Link>
                </Notice>
              )}
            </div>
          </section>
          <section aria-labelledby="market">
            <h2 id="market" className="section-title">
              최근 일주일 가격 변동
            </h2>
            <div className="mt-4">{data.market.length ? <Feed items={data.market} /> : <p className="text-muted">눈에 띄는 변동이 없어요.</p>}</div>
          </section>
        </div>
      )}
    </Page>
  );
}

function Feed({ items }: { items: UpdateItem[] }) {
  return (
    <ul className="divide-y divide-line rounded-2xl border border-line">
      {items.map((u, i) => {
        const Icon = u.kind === "drop" ? TrendingDown : u.kind === "record" ? TrendingUp : Bell;
        return (
          <li key={`${u.complex.id}-${i}`} className="flex gap-3 px-4 py-3.5">
            <Icon className={clsx("mt-0.5 h-5 w-5 shrink-0", u.kind === "drop" ? "text-brand" : "text-tag")} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-muted">{u.text}</p>
              <Link to={`/complex/${u.complex.id}`} className="font-bold hover:underline">
                {u.complex.name}
              </Link>
              <span className="text-[15px] text-muted">
                {" "}
                · {u.complex.sido} {u.complex.sgg} {u.complex.umd}
              </span>
              <p className={clsx("mt-0.5 text-[16px]", u.deal.canceled && "text-muted line-through")}>
                <b>{formatManwon(u.deal.amount)}</b> · 전용 {Math.round(u.deal.areaM2)}㎡ · {u.deal.floor}층 · {formatDate(u.deal.date)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
