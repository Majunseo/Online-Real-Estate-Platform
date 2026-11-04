import { HeroScene } from "@/components/illustrations/HeroScene";
import { SuggestSearch } from "@/components/search/SuggestSearch";

/**
 * 큰 배경 그림 위의 제목과 검색창(자동완성).
 * 자동완성 목록이 그림 아래로 내려와야 하므로 잘라 내기(overflow-hidden)는 그림 층에만 둔다.
 */
export function HeroSection() {
  return (
    <section className="relative z-20 h-[400px]" aria-label="단지 검색">
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <HeroScene className="absolute inset-0 h-full w-full" />
        {/* 글자가 잘 읽히도록 왼쪽을 어둡게 */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
      </div>
      <div className="relative flex h-full flex-col justify-center px-6 lg:pl-[86px]">
        <h1 className="text-[44px] font-black leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_8px_rgb(0_0_0/0.35)] sm:text-[60px] lg:text-[72px]">
          아파트. 실거래가.
          <br />
          시세. 대출.
        </h1>
        <SuggestSearch placeholder="단지명, 동네, 시군구를 입력하세요" className="mt-8 w-full max-w-[480px]" />
      </div>
    </section>
  );
}
