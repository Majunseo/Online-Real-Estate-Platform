import { Link } from "react-router-dom";
import { ActionArt, type ActionArtKind } from "@/components/illustrations/ActionArt";

interface ActionCard {
  art: ActionArtKind;
  title: string;
  body: string;
  cta: string;
  to: string;
}

/** 카드를 빼거나 바꿀 때 이 목록만 고친다. */
const CARDS: ActionCard[] = [
  {
    art: "buy",
    title: "내 집 마련",
    body: "중개사가 거래에 드는 비용을 미리 정리해 드려서, 예상하지 못한 지출을 줄일 수 있어요.",
    cta: "가까운 중개사 찾기",
    to: "/agents",
  },
  {
    art: "price",
    title: "시세 알아보기",
    body: "국토교통부 실거래가를 바탕으로 단지별 최근 거래와 가격 흐름을 보여 드려요.",
    cta: "실거래가 보기",
    to: "/deals",
  },
  {
    art: "sell",
    title: "내 집 팔기",
    body: "어떤 방법으로 팔든, 내 집 시세 확인부터 매도까지 차근차근 도와 드릴게요.",
    cta: "내 집 시세 알아보기",
    to: "/sell",
  },
];

/** 회색 띠 위의 안내 카드 세 장 */
export function ActionCardsSection() {
  return (
    <div className="bg-band px-6 py-14 lg:px-14">
      <ul className="grid gap-9 md:grid-cols-3">
        {CARDS.map((c) => (
          <li key={c.title} className="flex flex-col items-center rounded-3xl border border-line bg-surface px-8 pb-14 pt-12 text-center">
            <ActionArt kind={c.art} />
            <h3 className="mt-6 text-[32px] font-extrabold tracking-tight">{c.title}</h3>
            {/* 설명 길이가 달라도 단추가 세 카드에서 같은 높이에 오도록 설명이 남는 공간을 채운다 */}
            <p className="mt-3 max-w-[22rem] flex-1 text-[19px] leading-relaxed text-ink">{c.body}</p>
            <Link to={c.to} className="btn-outline mt-10 h-[60px] px-6 text-[20px]">
              {c.cta}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
