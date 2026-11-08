import { useEffect, useId, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, MapPin, Search } from "lucide-react";
import { clsx } from "clsx";
import { getJson } from "@/lib/api";

export interface Suggestion {
  kind: "sido" | "sgg" | "dong" | "complex";
  code: string;
  name: string;
  detail: string;
}

const KIND_LABEL: Record<Suggestion["kind"], string> = { sido: "시도", sgg: "시군구", dong: "동", complex: "단지" };

/** 후보를 고르면 갈 곳: 지역은 지도 검색으로(그 지역 선택), 단지는 단지 상세로 */
export const targetOf = (s: Suggestion) => (s.kind === "complex" ? `/complex/${encodeURIComponent(s.code)}` : `/search?${s.kind}=${s.code}`);

/** 띄어쓰기를 빼고 견준다 ("용인시 수지구" = "용인시수지구") */
const squash = (s: string) => s.replace(/\s+/g, "");

/**
 * 입력한 글자가 지역 이름 그 자체인지. "수지구" · "용인시 수지구" · "경기 용인시 수지구" 모두 수지구로 본다.
 * 같은 이름이 여러 시도에 있으면(남구 · 서구 …) 지금 고른 시도 안의 것을 먼저 고른다.
 */
export function matchRegion(items: Suggestion[], text: string, sido?: string | null): Suggestion | undefined {
  const q = squash(text);
  if (!q) return undefined;
  // "경기 용인시 수지구" 를 낱말로 나눠, 뒤에서부터 이어 붙인 것 중 하나와 같아야 한다 ("구" 처럼 낱말 일부만 맞는 건 아니다)
  const isWhole = (s: Suggestion) => {
    const words = `${s.detail} ${s.name}`.split(/\s+/).filter(Boolean);
    return words.some((_, i) => words.slice(i).join("") === q);
  };
  const hits = items.filter((s) => s.kind !== "complex" && isWhole(s));
  return hits.find((s) => sido && s.code.startsWith(sido)) ?? hits[0];
}

interface Props {
  placeholder: string;
  className?: string;
  /** 입력칸 id. 한 화면에 둘이면 다르게 준다 */
  id?: string;
  /** hero: 첫 화면의 큰 상자. bar: 지도 검색 줄의 한 칸 (가로 스크롤 상자 안이라 후보 목록을 화면 기준으로 띄운다) */
  variant?: "hero" | "bar";
  /** 처음 보일 글자 (지도 검색 줄은 주소의 검색어를 넣는다). 바뀌면 입력칸도 따라간다 */
  value?: string;
  /** 후보를 골랐을 때. 안 주면 지역은 지도 검색으로, 단지는 단지 상세로 간다 */
  onSelect?: (s: Suggestion) => void;
  /** 후보 없이 글자로 제출했을 때. 안 주면 지도 검색(?q=)으로 간다 */
  onSubmit?: (text: string) => void;
}

/**
 * 검색어 자동완성 검색창. 입력하는 동안 아래에 지역 · 단지 후보가 뜬다.
 * 키보드: ↑ ↓ 로 후보 이동, Enter 로 고르기(고른 후보가 없으면 입력한 글자로 검색), Esc 로 닫기.
 * WAI-ARIA combobox 방식이라 화면 낭독기도 후보 수와 지금 고른 후보를 읽는다.
 */
export function SuggestSearch({ placeholder, className, id = "hero-search", variant = "hero", value, onSelect, onSubmit }: Props) {
  const navigate = useNavigate();
  const listId = useId();
  const [q, setQ] = useState(value ?? "");
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const box = useRef<HTMLFormElement>(null);
  const bar = variant === "bar";
  useEffect(() => {
    if (value !== undefined) setQ(value);
  }, [value]);

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

  const showList = open && q.trim() !== "";

  // 검색 줄 칸: 가로 스크롤 상자에 잘리지 않게 후보 목록을 화면 기준(fixed)으로 입력칸 바로 아래에 둔다
  const [at, setAt] = useState({ left: 0, top: 0, width: 0 });
  useLayoutEffect(() => {
    if (!bar || !showList || !box.current) return;
    const place = () => {
      const r = box.current!.getBoundingClientRect();
      setAt({ left: r.left, top: r.bottom + 6, width: Math.max(r.width, 360) });
    };
    place();
    const away = () => setOpen(false);
    window.addEventListener("resize", away);
    window.addEventListener("scroll", away, true);
    return () => {
      window.removeEventListener("resize", away);
      window.removeEventListener("scroll", away, true);
    };
  }, [bar, showList]);

  const go = (s: Suggestion) => {
    setOpen(false);
    if (onSelect) return onSelect(s);
    navigate(targetOf(s));
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (open && active >= 0 && items[active]) return go(items[active]);
    setOpen(false);
    const text = q.trim();
    if (onSubmit) return onSubmit(text);
    navigate(`/search?q=${encodeURIComponent(text)}`);
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

  return (
    <form ref={box} onSubmit={submit} role="search" className={clsx("relative", className)}>
      <div
        className={clsx(
          "flex w-full items-center",
          bar ? "h-[54px] rounded-lg border-[1.5px] border-muted/60 pl-5 pr-2 focus-within:border-brand" : "h-[70px] rounded-lg bg-surface pl-5 pr-3 shadow-lg",
        )}
      >
        <label htmlFor={id} className="sr-only">
          {bar ? "지역 · 단지 검색" : "단지 · 지역 검색"}
        </label>
        <input
          id={id}
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
          className={clsx("h-full min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted/70 focus:outline-none", bar ? "text-[18px]" : "text-[19px]")}
        />
        <button type="submit" aria-label="검색" className={clsx("flex items-center justify-center rounded-full text-ink hover:bg-band", bar ? "h-10 w-10" : "h-12 w-12")}>
          <Search className={bar ? "h-6 w-6" : "h-7 w-7"} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>

      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label="검색어 자동완성"
          style={bar ? { left: at.left, top: at.top, width: at.width } : undefined}
          className={clsx(
            "z-30 max-h-[360px] overflow-auto rounded-lg border border-line bg-surface py-1.5 shadow-xl",
            bar ? "fixed" : "absolute inset-x-0 top-[calc(100%+6px)]",
          )}
        >
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
