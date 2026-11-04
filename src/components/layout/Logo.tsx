import { Link } from "react-router-dom";
import { SITE } from "@/config/site";

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-brand" />
      <path d="M7 25V14l9-7 9 7v11h-6v-7h-6v7z" fill="#fff" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2" aria-label={`${SITE.name} 홈`}>
      <LogoMark className="h-7 w-7" />
      <span className="text-[28px] font-black tracking-tight text-ink">{SITE.name}</span>
    </Link>
  );
}
