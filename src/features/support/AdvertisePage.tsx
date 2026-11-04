import { BarChart3, Map, Megaphone } from "lucide-react";
import { Page } from "@/components/page/Page";
import { useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { InquiryForm } from "./InquiryForm";
import { InquiryLookup, MyInquiries } from "./InquiryHistory";

const PRODUCTS = [
  { icon: Map, title: "지도 상단 배너", body: "지역을 고른 사용자에게 지도 위쪽에 노출돼요." },
  { icon: BarChart3, title: "단지 상세 광고", body: "특정 시군구 단지 상세 화면에 노출돼요." },
  { icon: Megaphone, title: "로그인 화면 광고", body: "로그인 · 회원가입 화면 오른쪽 넓은 영역에 노출돼요." },
];

/** 광고 문의: 광고 상품 소개 + 문의 양식 (로그인 없이 보낼 수 있다) + 내 문의 조회 */
export function AdvertisePage() {
  const { user } = useAuth();
  const [sent, setSent] = useState(0);
  return (
    <Page title="광고 문의" description="집터에 광고를 내고 싶으시면 아래 양식으로 문의해 주세요. 담당자가 이메일로 연락드려요.">
      <div className="grid gap-10 lg:grid-cols-[1fr_480px]">
        <section aria-labelledby="products-title">
          <h2 id="products-title" className="section-title">
            광고 상품
          </h2>
          <ul className="mt-4 space-y-3">
            {PRODUCTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4 rounded-2xl border border-line p-5">
                <Icon className="h-7 w-7 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <h3 className="text-[18px] font-bold">{title}</h3>
                  <p className="mt-0.5 text-[16px] text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] text-muted">광고 단가와 노출 기준은 문의 주시면 안내해 드려요.</p>
        </section>
        <section aria-labelledby="ad-form-title">
          <h2 id="ad-form-title" className="section-title">
            문의하기
          </h2>
          <div className="mt-4">
            {/* 계정이 바뀌면(로그인 · 로그아웃) 양식을 새로 만든다: 앞 사람이 적은 내용과 접수 안내가 남지 않게 */}
            <InquiryForm key={user?.id ?? "guest"} kind="advertise" onSent={() => setSent((n) => n + 1)} />
          </div>
          {/* 로그인했으면 내가 낸 광고 문의를 바로 보여 주고, 아니면 접수번호 + 이메일로 조회 */}
          {user ? <MyInquiries kind="advertise" refreshKey={sent} /> : <InquiryLookup />}
        </section>
      </div>
    </Page>
  );
}
