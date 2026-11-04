import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { apiPlugin } from "./server/vite-plugin-api";

// 화면과 API 가 한 포트에서 돈다 (Agora 와 같은 구조).
// 정상본 8094, 결함본 8095 (npm run dev:bugs). 네이버 지도 Web 서비스 URL 에 두 포트가 등록돼 있다.
export default defineConfig({
  server: { host: "127.0.0.1", port: 8094, strictPort: true },
  preview: { host: "127.0.0.1", port: 8094, strictPort: true },
  plugins: [react(), apiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
});
