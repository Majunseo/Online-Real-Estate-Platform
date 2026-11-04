import type { ReactNode } from "react";
import type { Complex } from "@shared/types";
import { Carousel } from "@/components/ui/Carousel";
import { ComplexCard, LoadingCard } from "@/components/listing/ComplexCard";

/** 제목이 있는 단지 카드 한 줄. 추천 · 지역별 추천이 함께 쓴다. */
export function ComplexRow({ title, subtitle, items, label }: { title: string; subtitle: ReactNode; items: Complex[] | null; label: string }) {
  return (
    <div className="px-6 py-12 lg:px-14">
      <Carousel title={title} subtitle={subtitle} label={label}>
        {items ? items.map((c) => <ComplexCard key={c.id} c={c} />) : Array.from({ length: 4 }, (_, i) => <LoadingCard key={i} />)}
      </Carousel>
    </div>
  );
}
