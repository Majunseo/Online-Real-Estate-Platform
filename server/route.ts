import type { IncomingMessage, ServerResponse } from "http";
import { currentUser } from "./auth/session";
import { fail } from "./http";

/** 주소의 :변수 값 (예: "/api/complexes/:id" → { id }) */
export type Params = Record<string, string>;

export type Handler = (req: IncomingMessage, res: ServerResponse, url: URL, params: Params) => true | Promise<true>;

/** "메서드 경로" → 처리기. 경로에 :이름 을 쓰면 그 자리 값을 params 로 받는다 */
export type Routes = Record<string, Handler>;

/** 정확히 같은 경로를 먼저, 없으면 :변수 가 든 경로를 차례로 맞춰 본다 */
export function findRoute(routes: Routes, method: string, path: string): { handler: Handler; params: Params } | undefined {
  const exact = routes[`${method} ${path}`];
  if (exact) return { handler: exact, params: {} };
  const parts = path.split("/");
  for (const [key, handler] of Object.entries(routes)) {
    const [m, pattern] = key.split(" ");
    if (m !== method || !pattern.includes("/:")) continue;
    const want = pattern.split("/");
    if (want.length !== parts.length) continue;
    const params: Params = {};
    if (want.every((seg, i) => (seg.startsWith(":") ? ((params[seg.slice(1)] = decodeURIComponent(parts[i])), true) : seg === parts[i]))) {
      return { handler, params };
    }
  }
  return undefined;
}

/** 로그인한 회원. 아니면 401 을 보내고 undefined (부른 쪽은 그대로 return true) */
export function requireUser(req: IncomingMessage, res: ServerResponse) {
  const user = currentUser(req);
  if (!user) fail(res, 401, { error: "unauthorized", message: "로그인이 필요해요." });
  return user;
}
