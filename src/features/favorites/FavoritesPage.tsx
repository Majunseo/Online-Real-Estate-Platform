import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Search, X } from "lucide-react";
import type { Complex } from "@shared/types";
import { getJson, sendJson, useJson } from "@/lib/api";
import { ComplexCard } from "@/components/listing/ComplexCard";
import { Notice, Page, RequireLogin } from "@/components/page/Page";
import { useFavorites } from "./FavoritesProvider";

/** 관심 단지: 하트를 누른 단지 모음(여기서 하트를 다시 누르면 빠진다)과 저장한 검색 */
export function FavoritesPage() {
  return (
    <Page title="관심 단지" description="담아 둔 단지와 저장한 검색을 모아 봤어요.">
      <RequireLogin what="관심 단지">
        <SavedSearches />
        <FavoriteList />
      </RequireLogin>
    </Page>
  );
}

interface SavedSearch {
  id: number;
  name: string;
  query: string;
  createdAt: string;
}

/** 지도 검색 줄의 "검색 저장"으로 저장한 검색. 누르면 그 조건으로 지도가 열린다 */
function SavedSearches() {
  const [items, setItems] = useState<SavedSearch[] | null>(null);
  useEffect(() => {
    getJson<{ items: SavedSearch[] }>("/api/saved-searches").then((r) => setItems(r.items));
  }, []);
  if (!items?.length) return null;
  return (
    <section aria-labelledby="saved-title" className="mb-10">
      <h2 id="saved-title" className="text-[20px] font-bold">
        저장한 검색 {items.length}개
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {items.map((s) => (
          <li key={s.id} className="flex items-center rounded-full border-[1.5px] border-muted/50 pl-4 pr-1">
            <Link to={`/search?${s.query}`} className="py-2 text-[16px] font-bold hover:underline">
              <Search className="mr-1.5 inline h-4 w-4 text-muted" aria-hidden="true" />
              {s.name}
            </Link>
            <button
              type="button"
              aria-label={`${s.name} 저장한 검색 지우기`}
              onClick={async () => setItems((await sendJson<{ items: SavedSearch[] }>("DELETE", `/api/saved-searches/${s.id}`)).items)}
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-band hover:text-tag"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function FavoriteList() {
  const { has, count } = useFavorites();
  // 담거나 뺄 때마다 목록을 다시 받는다 (count 가 바뀌면 주소가 바뀌어 다시 부른다)
  const { data, loading } = useJson<{ items: Complex[] }>(`/api/favorites?v=${count}`);
  const items = (data?.items ?? []).filter((c) => has(c.id));

  if (loading && !data) return <p className="py-16 text-center text-muted">불러오는 중…</p>;
  if (!items.length)
    return (
      <Notice icon={Heart} title="아직 담은 단지가 없어요">
        단지 카드나 상세 화면의 하트를 누르면 여기에 모여요.{" "}
        <Link to="/search" className="font-bold text-brand hover:underline">
          지도에서 찾기
        </Link>
      </Notice>
    );
  return (
    <>
      <p className="text-[17px]">{items.length}곳</p>
      <ul className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((c) => (
          <li key={c.id}>
            <ComplexCard c={c} className="w-full" />
          </li>
        ))}
      </ul>
    </>
  );
}
