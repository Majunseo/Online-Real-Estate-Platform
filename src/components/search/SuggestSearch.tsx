import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, Search } from "lucide-react";
import { clsx } from "clsx";
import { getJson } from "@/lib/api";

interface Suggestion {
  kind: "sido" | "sgg" | "dong" | "complex";
  code: string;
  name: string;
  detail: string;
}

const KIND_LABEL: Record<Suggestion["kind"], string> = { sido: "시도", sgg: "시군구", dong: "동", complex: "단지" };

/** 후보를 고르면 갈 곳: 지역은 지도 검색으로(그 지역 선택), 단지는 단지 상세로 */
const targetOf = (s: Suggestion) => (s.kind === "complex" ? `/complex/${encodeURIComponent(s.code)}` : `/search?${s.kind}=${s.code}`);

/**
 * 검색어 자동완성 검색창. 입력하는 동안 아래에 지역 · 단지 후보가 뜬다.
 * 키보드: ↑ ↓ 로 후보 이동, Enter 로 고르기(고른 후보가 없으면 입력한 글자로 검색), Esc 로 닫기.
 * WAI-ARIA combobox 방식이라 화면 낭독기도 후보 수와 지금 고른 후보를 읽는다.
 */
export function SuggestSearch({ placeholder, className }: { placeholder: string; className?: string }) {
  const navigate = useNavigate();
  const listId = useId();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);

  // 입력이 잠깐 멈추면(150ms) 후보를 받는다. 늦게 온 이전 응답은 버린다
  useEffect(() => {
    const text = q.trim();
    if (!text) return setItems([]);
    let alive = true;
    const t = setTimeout(() => {
      getJson<{ items: Suggestion[] }>(`/api/suggest?q=${encodeURIComponent(text)}`)
        .then((r) => {
          if (!alive) return;
          setItems(r.items);
          setActive(-1);
        })
        .catch(() => alive && setItems([]));
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  // 바깥을 누르면 닫는다
  useEffect(() => {
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (s: Suggestion) => {
    setOpen(false);
    navigate(targetOf(s));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (open && active >= 0 && items[active]) return go(items[active]);
    setOpen(false);
    navigate(`/search?q=${encodeURIComponent(q.trim())}`);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp" && items.length) {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  };

  const showList = open && q.trim() !== "";
  return (
    <form ref={box} onSubmit={submit} role="search" className={clsx("relative", className)}>
      <div className="flex h-[70px] w-full items-center rounded-lg bg-surface pl-5 pr-3 shadow-lg">
        <label htmlFor="hero-search" className="sr-only">
          단지 · 지역 검색
        </label>
        <input
          id="hero-search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={showList && items.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[19px] text-ink placeholder:text-muted/70 focus:outline-none"
        />
        <button type="submit" aria-label="검색" className="flex h-12 w-12 items-center justify-center rounded-full text-ink hover:bg-band">
          <Search className="h-7 w-7" strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>

      {showList && (
        <ul id={listId} role="listbox" aria-label="검색어 자동완성" className="absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-[360px] overflow-auto rounded-lg border border-line bg-surface py-1.5 shadow-xl">
          {items.length === 0 ? (
            <li className="px-5 py-3 text-[16px] text-muted" role="presentation">
              맞는 지역 · 단지가 없어요. Enter 를 누르면 "{q.trim()}"(으)로 검색해요.
            </li>
          ) : (
            items.map((s, i) => {
              const Icon = s.kind === "complex" ? Building2 : MapPin;
              return (
                <li
                  key={`${s.kind}-${s.code}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => e.preventDefault()} // 입력칸의 포커스를 지키며 고른다
                  onClick={() => go(s)}
                  onMouseEnter={() => setActive(i)}
                  className={clsx("flex cursor-pointer items-center gap-3 px-5 py-2.5", i === active && "bg-brand-soft")}
                >
                  <Icon className="h-5 w-5 shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-bold text-ink">{highlight(s.name, q.trim())}</span>
                    <span className="block truncate text-[14px] text-muted">{s.detail}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-band px-2 py-0.5 text-[12px] text-muted">{KIND_LABEL[s.kind]}</span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </form>
  );
}

/** 입력한 글자와 겹치는 부분을 굵게 */
function highlight(text: string, q: string) {
  const i = q ? text.indexOf(q) : -1;
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-transparent text-brand">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}
