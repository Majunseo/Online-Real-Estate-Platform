import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./features/auth/AuthProvider";
import { FavoritesProvider } from "./features/favorites/FavoritesProvider";
import { InboxCountProvider } from "./features/inbox/InboxCount";
import "./styles/index.css";

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
);
