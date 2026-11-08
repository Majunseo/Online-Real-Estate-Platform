import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./features/auth/AuthProvider";
import { FavoritesProvider } from "./features/favorites/FavoritesProvider";
import { InboxCountProvider } from "./features/inbox/InboxCount";
import { loadEnabled } from "./lib/bugs";
import "./styles/index.css";

// 결함 토글(GET /api/bugs)을 먼저 받고 그린다. 첫 화면부터 토글을 읽는 코드(대출 계산 · 평당 가격 등)가 정상본으로 한 번 그려졌다가 바뀌지 않게.
// 못 받으면(오류 · 시간 초과) 빈 목록 = 정상 동작으로 그린다.
const ready = Promise.race([loadEnabled(), new Promise((r) => setTimeout(r, 1500))]);

ready.then(() =>
  createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <InboxCountProvider>
            <App />
          </InboxCountProvider>
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
),
);
