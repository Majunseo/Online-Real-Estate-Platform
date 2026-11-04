/** 간편 로그인 목록. 빼거나 순서를 바꿀 때 이 배열만 고친다. */

function KakaoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#FEE500" />
      <path d="M12 6.2c-3.9 0-7 2.4-7 5.4 0 1.9 1.3 3.6 3.2 4.6l-.7 2.6c-.1.3.2.5.4.3l3.1-2.1h1c3.9 0 7-2.4 7-5.4s-3.1-5.4-7-5.4z" fill="#191919" />
    </svg>
  );
}

function NaverIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <rect width="24" height="24" rx="6" fill="#03C75A" />
      <path d="M13.6 12.4 10.2 7.5H7.5v9h2.9v-4.9l3.4 4.9h2.7v-9h-2.9z" fill="#fff" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden="true">
      <path d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z" fill="#4285F4" />
      <path d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z" fill="#34A853" />
      <path d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9z" fill="#FBBC05" />
      <path d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.5l3.3 2.6C7.2 7.8 9.4 6 12 6z" fill="#EA4335" />
    </svg>
  );
}

export interface SocialProvider {
  id: "kakao" | "naver" | "google";
  label: string;
  Icon: () => JSX.Element;
}

export const SOCIAL_PROVIDERS: SocialProvider[] = [
  { id: "kakao", label: "카카오로 계속하기", Icon: KakaoIcon },
  { id: "naver", label: "네이버로 계속하기", Icon: NaverIcon },
  { id: "google", label: "Google로 계속하기", Icon: GoogleIcon },
];
