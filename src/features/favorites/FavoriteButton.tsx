import { Heart } from "lucide-react";
import { clsx } from "clsx";
import { useFavorites } from "./FavoritesProvider";

/** 하트 단추. 카드 위(variant="overlay")와 상세 화면 제목 옆(variant="inline")에 쓴다 */
export function FavoriteButton({ complexId, name, variant = "overlay" }: { complexId: string; name: string; variant?: "overlay" | "inline" }) {
  const { has, toggle } = useFavorites();
  const on = has(complexId);
  const label = on ? `${name} 관심 단지에서 빼기` : `${name} 관심 단지에 담기`;
  return (
    <button
      type="button"
      onClick={() => toggle(complexId)}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={clsx(
        "flex items-center justify-center gap-2 rounded-full transition-colors",
        variant === "overlay" ? "h-10 w-10 bg-black/35 text-white hover:bg-black/50" : "h-11 border-[1.5px] border-muted/60 px-4 text-[16px] font-bold hover:bg-band",
      )}
    >
      <Heart className={clsx("h-6 w-6", on && "fill-tag text-tag")} strokeWidth={2.2} aria-hidden="true" />
      {variant === "inline" && (on ? "관심 단지" : "관심 단지 담기")}
    </button>
  );
}
