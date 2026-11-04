import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { clsx } from "clsx";
import { Page, RequireLogin } from "@/components/page/Page";
import { useAuth } from "@/features/auth/AuthProvider";
import { useInboxCount } from "@/features/inbox/InboxCount";
import { InquiryForm } from "./InquiryForm";
import { MyInquiries } from "./InquiryHistory";

/** 자주 묻는 질문. 답이 바뀌면 이 배열만 고친다 */
const FAQ: { q: string; a: string }[] = [
  { q: "실거래가는 어디서 가져오나요?", a: "국토교통부 아파트 매매 실거래가 공개 자료(공공데이터포털)를 받아 보여 드려요. 계약 후 30일 안에 신고되므로 최근 거래는 늦게 보일 수 있어요." },
  { q: "지도에 회색으로 보이는 지역은 뭔가요?", a: "아직 실거래가 자료를 받아 두지 않은 시군구예요. 자료를 받으면 다른 지역처럼 단지가 표시돼요." },
  { q: "'직전 거래보다 낮음'은 어떻게 계산하나요?", a: "같은 단지 · 같은 전용면적(㎡ 반올림)의 바로 앞 거래와 비교해요. 층과 향은 고려하지 않아요." },
  { q: "관심 단지 알림은 어디서 보나요?", a: "왼쪽 아이콘 줄의 '새 소식'에서 관심 단지의 최근 30일 거래를 모아 보여 드려요." },
  { q: "내놓은 매물은 다른 사람에게 보이나요?", a: "아니요, 등록한 본인만 볼 수 있어요. 집터는 신고된 실거래가를 보여 주는 서비스라 매물을 다른 사람에게 공개하거나 중개사무소에 보내지 않아요." },
  { q: "비밀번호를 잊어버렸어요.", a: "비밀번호 찾기는 아직 제공하지 않아요. 다른 이메일로 새로 가입해 주세요. 로그인한 상태라면 머리글의 내 이름을 눌러 '내 계정'에서 비밀번호를 바꿀 수 있어요." },
  { q: "탈퇴는 어떻게 하나요?", a: "로그인한 뒤 머리글의 내 이름을 눌러 '내 계정' 맨 아래에서 탈퇴할 수 있어요. 탈퇴하면 계정과 관심 단지 · 매물 · 메시지 · 문의 등 모든 기록이 바로 지워져요." },
];

/** 고객센터: 자주 묻는 질문 + 1:1 문의(로그인 필요, 접수 안내는 메시지함으로) */
export function HelpPage() {
  const [open, setOpen] = useState<number | null>(0);
  const { user } = useAuth();
  const { refresh } = useInboxCount();
  const [sent, setSent] = useState(0);
  return (
    <Page title="고객센터" description="자주 묻는 질문을 먼저 확인하고, 해결되지 않으면 1:1 문의를 남겨 주세요.">
      <div className="grid gap-10 lg:grid-cols-[1fr_440px]">
        <section aria-labelledby="faq-title">
          <h2 id="faq-title" className="section-title">
            자주 묻는 질문
          </h2>
          <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
            {FAQ.map((f, i) => (
              <li key={f.q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={open === i}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOpen(open === i ? null : i)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[17px] font-bold hover:bg-band"
                  >
                    {f.q}
                    <ChevronDown className={clsx("h-5 w-5 shrink-0 text-brand transition-transform", open === i && "rotate-180")} aria-hidden="true" />
                  </button>
                </h3>
                {open === i && (
                  <p id={`faq-${i}`} className="px-5 pb-4 text-[16px] leading-relaxed text-muted">
                    {f.a}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="ask-title">
          <h2 id="ask-title" className="section-title">
            1:1 문의
          </h2>
          <div className="mt-4">
            <RequireLogin what="1:1 문의">
              <InquiryForm
                key={user?.id ?? "guest"}
                kind="help"
                defaults={{ name: user?.name ?? "", email: user?.email ?? "" }}
                onSent={() => {
                  refresh();
                  setSent((n) => n + 1);
                }}
              />
              <p className="mt-3 text-[14px] text-muted">
                접수 안내와 답변은{" "}
                <Link to="/inbox" className="font-bold text-brand hover:underline">
                  메시지함
                </Link>
                으로 보내 드려요.
              </p>
              <MyInquiries refreshKey={sent} />
            </RequireLogin>
          </div>
        </section>
      </div>
    </Page>
  );
}
