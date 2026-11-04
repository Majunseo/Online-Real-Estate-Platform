import type { ComponentType } from "react";
import type { HomeData } from "@shared/types";
import type { MyLocation } from "@/lib/myLocation";

export interface HomeSectionProps {
  /** /api/home 응답. 불러오는 중이면 null */
  data: HomeData | null;
  /** 현재 위치 상태와, 브라우저에 위치를 묻는 함수 (추천 단지 구역이 쓴다) */
  location: MyLocation;
  requestLocation: () => void;
}

export interface HomeSection {
  id: string;
  Component: ComponentType<HomeSectionProps>;
}
