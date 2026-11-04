import type { ReactElement } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { AccountPage } from "@/features/account/AccountPage";
import { AgentsPage } from "@/features/agents/AgentsPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ComplexPage } from "@/features/complex/ComplexPage";
import { DealsPage } from "@/features/deals/DealsPage";
import { DocPage, NoticePage } from "@/features/docs/DocPage";
import { FavoritesPage } from "@/features/favorites/FavoritesPage";
import { HomePage } from "@/features/home/HomePage";
import { InboxPage } from "@/features/inbox/InboxPage";
import { LoanPage } from "@/features/loan/LoanPage";
import { RatesPage } from "@/features/loan/RatesPage";
import { PlanPage } from "@/features/plan/PlanPage";
import { SearchPage } from "@/features/search/SearchPage";
import { SellPage } from "@/features/sell/SellPage";
import { AdvertisePage } from "@/features/support/AdvertisePage";
import { HelpPage } from "@/features/support/HelpPage";
import { UpdatesPage } from "@/features/updates/UpdatesPage";
import { NotFoundPage } from "@/pages/PlaceholderPage";

/** 머리글 · 왼쪽 아이콘 줄 · 바닥글이 있는 일반 화면. 화면을 더하거나 뺄 때 이 표만 고친다 */
const PAGES: [path: string, element: ReactElement][] = [
  ["/complex/:id", <ComplexPage />],
  ["/deals", <DealsPage />],
  ["/loan", <LoanPage />],
  ["/loan/rates", <RatesPage />],
  ["/agents", <AgentsPage />],
  ["/sell", <SellPage />],
  ["/favorites", <FavoritesPage />],
  ["/updates", <UpdatesPage />],
  ["/plan", <PlanPage />],
  ["/inbox", <InboxPage />],
  ["/account", <AccountPage />],
  ["/help", <HelpPage />],
  ["/advertise", <AdvertisePage />],
  ["/notice", <NoticePage />],
  ...["/about", "/about/pricing", "/terms", "/privacy", "/terms/location"].map((p): [string, ReactElement] => [p, <DocPage />]),
];

export function App() {
  return (
    <Routes>
      {/* 로그인 · 회원가입은 머리글 · 바닥글 없이 한 화면 */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        {PAGES.map(([path, element]) => (
          <Route key={path} path={path} element={element} />
        ))}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route element={<Layout fill />}>
        <Route path="/search" element={<SearchPage />} />
      </Route>
    </Routes>
  );
}
