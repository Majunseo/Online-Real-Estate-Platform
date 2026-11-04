import { ListChecks, Map as MapIcon, MousePointerClick } from "lucide-react";

const TIPS = [
  {
    icon: MousePointerClick,
    title: "지도에서 지역을 눌러 보세요",
    body: "시도를 누르면 시군구가, 시군구를 누르면 동이 나와요. 고른 곳에는 파란 테두리가 생기고 그 지역 단지가 오른쪽에 떠요.",
  },
  {
    icon: ListChecks,
    title: "지역 이름이나 단지 이름을 입력하세요",
    examples: ["경기", "마포구", "상암동"],
  },
  {
    icon: MapIcon,
    title: "검색 범위를 넓혀 보세요",
    body: "동 이름 대신 시군구나 시도로 찾으면 더 많은 단지가 나와요.",
  },
];

/** 아직 지역을 고르지 않았거나 결과가 없을 때 보여 주는 안내 */
export function SearchTips() {
  return (
    <section aria-labelledby="search-tips" className="border-t border-line pt-8">
      <h2 id="search-tips" className="text-[16px] font-bold tracking-wide text-muted">
        검색 도움말
      </h2>
      <ul className="mt-6 space-y-8">
        {TIPS.map(({ icon: Icon, title, body, examples }) => (
          <li key={title} className="flex gap-5">
            <Icon className="mt-1 h-8 w-8 shrink-0" strokeWidth={2} aria-hidden="true" />
            <div>
              <p className="text-[22px] font-bold tracking-tight">{title}</p>
              {body && <p className="mt-1 text-[18px] text-muted">{body}</p>}
              {examples && (
                <ul className="mt-1 list-disc pl-6 text-[18px] text-muted">
                  {examples.map((e) => (
                    <li key={e}>"{e}"</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
