import { LocateFixed } from "lucide-react";
import type { HomeSectionProps } from "../types";
import { ComplexRow } from "./ComplexRow";

/** 추천 단지: 허용한 현재 위치 근처 단지. 위치가 없으면 요즘 거래가 많은 단지 */
export function RecommendedSection({ data, location, requestLocation }: HomeSectionProps) {
  const rec = data?.recommended;
  const subtitle = !rec ? (
    "추천 단지를 고르는 중이에요"
  ) : (
    <>
      {rec.reason}
      {rec.basis === "popular" && location.status === "ask" && (
        <button type="button" onClick={requestLocation} className="ml-3 inline-flex items-center gap-1 align-middle text-[16px] font-bold text-brand hover:underline">
          <LocateFixed className="h-4 w-4" aria-hidden="true" />내 위치 주변 단지 보기
        </button>
      )}
      {rec.basis === "popular" && location.status === "denied" && (
        <span className="mt-1 block text-[15px]">위치 권한을 허용하면 내 주변 단지를 보여 드려요 (브라우저 주소창의 사이트 설정에서 바꿀 수 있어요).</span>
      )}
    </>
  );
  return <ComplexRow title={rec?.basis === "location" ? "내 주변 단지" : "추천 단지"} subtitle={subtitle} items={rec?.items ?? null} label="추천 단지" />;
}
