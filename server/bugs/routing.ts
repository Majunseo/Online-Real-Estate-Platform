import type { Bug } from "./types";

/**
 * 이동 · 라우팅 결함. ID 접두사 N.
 * 링크가 깨지거나 404 가 나는 것이 아니라, 멀쩡한 화면이 열리는데 '기대한 곳' 과 '열린 곳' 이 다르다 (detectable: false).
 */
export const routingBugs: Bug[] = [
  {
    id: "N1",
    area: "routing",
    symptom: "wrong_target",
    title: "로그인 뒤 하던 화면으로 돌아오지 않고 첫 화면으로 간다",
    description: "로그인 주소의 next 를 무시해 로그인이 끝나면 항상 첫 화면(/)으로 간다. 로그인 자체는 성공이라 오류가 없다.",
    location: "src/features/auth/AuthProvider.tsx safeNext()",
    reproduce:
      "로그아웃 상태 → 머리글 '내 집 내놓기' → 잠금 안내의 '로그인하기' → demo@jipteo.kr / jipteo1234 로그인. 정상본은 '내 집 내놓기' 화면으로 돌아오고, 결함본은 첫 화면이 열린다. 로그인 화면 주소에 next 가 붙어 있는 것은 두 판이 같다.",
    detectable: false,
    needs: ["로그인 전 위치 기억", "로그인 뒤 도착 화면과 기대 비교"],
  },
  {
    id: "N2",
    area: "routing",
    symptom: "partial",
    title: "검색 조건을 바꾼 기록이 뒤로 가기에 남지 않는다",
    description:
      "가격 · 면적 · 준공 연도 · 필터 조건을 바꿀 때 주소를 교체(replace)해 버려서, 조건을 바꾼 뒤 뒤로 가기를 누르면 조건이 한 단계씩 풀리지 않고 검색 화면에 들어오기 전 화면(첫 화면 등)으로 나가 버린다. 지역 선택은 정상적으로 기록에 남는다.",
    location: "src/features/search/useSearchState.ts write()",
    reproduce:
      "첫 화면 → 머리글 '매매' → 지도에서 '경기' 클릭 → 검색 줄 '가격' → 최대 5억 → 다시 최대 10억 → 브라우저 뒤로 가기. 정상본은 '가격 최대 5억' 상태로 돌아가고, 결함본은 검색 화면을 벗어나 첫 화면으로 간다 (조건을 바꾼 기록이 주소 기록에 남지 않아서). 지역을 바꾼 뒤의 뒤로 가기는 두 판 모두 정상.",
    detectable: false,
    needs: ["여러 번 조작한 뒤 브라우저 뒤로 가기 동작 확인", "주소(URL) 변화 관찰"],
  },
];
