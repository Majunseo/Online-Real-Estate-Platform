import { useSearchParams } from "react-router-dom";
import { readFilter, writeFilter, type ListFilter } from "@shared/filters";
import type { SearchFilter, SortKey } from "@shared/types";
import { sidoByCode, sidoByName, type Sido } from "@shared/regions";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "최근 거래순" },
  { value: "price-desc", label: "가격 높은순" },
  { value: "price-asc", label: "가격 낮은순" },
  { value: "area-desc", label: "면적 넓은순" },
];

const isSort = (s: string | null): s is SortKey => SORT_OPTIONS.some((o) => o.value === s);
const digits = (s: string | null, n: number) => (s && new RegExp(`^\\d{${n}}$`).test(s) ? s : null);

export interface SearchState {
  sido: Sido | undefined;
  /** 시군구 코드 5자리 (sido 안) */
  sgg: string | null;
  /** 행정동 코드 10자리 (sgg 안) */
  dong: string | null;
  q: string;
  sort: SortKey;
  /** 검색 줄 조건 (매매 기간 · 가격 · 면적 · 준공 연도 · 필터) */
  list: ListFilter;
  /** 서버에 넘길 조건 */
  filter: SearchFilter;
  /**
   * 지역을 고른다. 코드 길이로 단계를 안다: 2자리 시도 · 5자리 시군구 · 10자리 동, null 은 전국.
   * 위 단계는 코드 앞자리로 채우고, 아래 단계와 검색어는 지운다.
   */
  selectRegion: (code: string | null) => void;
  /** 검색창 제출. 시도 이름만 적었으면 그 시도를 고른 것으로 본다. */
  submitQuery: (text: string) => void;
  setSort: (sort: SortKey) => void;
  setList: (list: ListFilter) => void;
}

/**
 * 검색 조건은 주소(?sido=12&sgg=12240&dong=1224074500&q=&sort=)에 둔다. 새로 고침 · 뒤로 가기 · 링크 공유가 그대로 된다.
 * 첫 화면 검색창에서 "서울" 처럼 시도 이름만 넘어오면 그 시도를 고른 것으로 읽는다.
 */
export function useSearchState(): SearchState {
  const [params, setParams] = useSearchParams();
  const rawQ = params.get("q") ?? "";
  const dong = digits(params.get("dong"), 10);
  const sgg = digits(params.get("sgg"), 5) ?? dong?.slice(0, 5) ?? null;
  const sidoParam = params.get("sido") ?? sgg?.slice(0, 2) ?? null;
  const fromQ = sidoParam ? undefined : sidoByName(rawQ);
  const sido = sidoByCode(sidoParam) ?? fromQ;
  const q = fromQ ? "" : rawQ;
  const sortParam = params.get("sort");
  const sort: SortKey = isSort(sortParam) ? sortParam : "recent";
  const list = readFilter(params);

  const write = (next: { code?: string | null; q?: string; sort?: SortKey; list?: ListFilter }) => {
    const code = next.code === undefined ? current : next.code;
    const p = new URLSearchParams();
    if (code) p.set("sido", code.slice(0, 2));
    if (code && code.length >= 5) p.set("sgg", code.slice(0, 5));
    if (code && code.length >= 10) p.set("dong", code);
    const text = next.q ?? q;
    const so = next.sort ?? sort;
    if (text) p.set("q", text);
    if (so !== "recent") p.set("sort", so);
    writeFilter(p, next.list ?? list); // 지역을 바꿔도 검색 줄 조건은 그대로 둔다
    setParams(p);
  };

  // 서로 맞지 않는 코드(다른 시도의 시군구 등)는 버린다
  const okSgg = sido && sgg?.startsWith(sido.code) ? sgg : null;
  const okDong = okSgg && dong?.startsWith(okSgg) ? dong : null;
  const current = okDong ?? okSgg ?? sido?.code ?? null;
  return {
    sido,
    sgg: okSgg,
    dong: okDong,
    q,
    sort,
    list,
    filter: { sido: sido?.code ?? null, sgg: okSgg, dong: okDong, q, list },
    selectRegion: (code) => write({ code, q: code === current ? q : "" }),
    submitQuery: (text) => {
      const asSido = sidoByName(text);
      write(asSido ? { code: asSido.code, q: "" } : { q: text.trim() });
    },
    setSort: (s) => write({ sort: s }),
    setList: (l) => write({ list: l }),
  };
}
