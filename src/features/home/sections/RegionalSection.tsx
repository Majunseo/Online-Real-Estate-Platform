import type { HomeSectionProps } from "../types";
import { ComplexRow } from "./ComplexRow";

/** 지역 추천: 가장 최근에 본 단지의 시군구 (본 적이 없으면 최근 한 달 거래가 가장 많은 시군구) */
export function RegionalSection({ data }: HomeSectionProps) {
  const region = data?.regional.region || "내 지역";
  return <ComplexRow title={`${region} 단지`} subtitle={data?.regional.reason ?? "지역을 고르는 중이에요"} items={data?.regional.items ?? null} label={`${region} 단지`} />;
}
