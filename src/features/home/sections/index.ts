import type { HomeSection } from "../types";
import { ActionCardsSection } from "./ActionCardsSection";
import { AffordabilitySection } from "./AffordabilitySection";
import { HeroSection } from "./HeroSection";
import { RecommendedSection } from "./RecommendedSection";
import { RegionalSection } from "./RegionalSection";

/**
 * 첫 화면에 위에서부터 그릴 구역. 구역을 빼려면 줄을 지우고, 순서를 바꾸려면 줄을 옮긴다.
 * 구역끼리는 서로를 모른다 (같은 data 만 받는다).
 */
export const HOME_SECTIONS: HomeSection[] = [
  { id: "hero", Component: HeroSection },
  { id: "recommended", Component: RecommendedSection },
  { id: "affordability", Component: AffordabilitySection },
  { id: "actions", Component: ActionCardsSection },
  { id: "regional", Component: RegionalSection },
];
