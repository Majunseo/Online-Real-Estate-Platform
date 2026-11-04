import { useEffect, useState } from "react";
import type { ApiErrorBody } from "@shared/auth";

export async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json() as Promise<T>;
}

/** API 가 오류로 답했을 때. field 가 있으면 그 입력칸 아래에 message 를 띄운다 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
  }
}

/** JSON 을 보내고 JSON 을 받는다. 2xx 가 아니면 ApiError */
export async function sendJson<T>(method: "POST" | "PUT" | "DELETE", path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, { error: "invalid_input", message: "잠시 뒤 다시 시도해 주세요.", ...data });
  return data as T;
}

export const postJson = <T,>(path: string, body: unknown = {}) => sendJson<T>("POST", path, body);

export interface Async<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/**
 * GET 한 번. 화면을 떠나면 늦게 온 응답은 버린다. path 가 null 이면 부르지 않는다.
 * 응답은 그 응답을 받은 path 와 함께 들고 있다가, 지금 path 의 것일 때만 돌려준다.
 * (path 가 바뀐 직후 한 번의 렌더에서 이전 주소의 응답이 새어 나가지 않게)
 */
export function useJson<T>(path: string | null): Async<T> {
  const [state, setState] = useState<Async<T> & { path: string | null }>({ path, data: null, error: null, loading: path !== null });
  useEffect(() => {
    let alive = true;
    if (path === null) {
      setState({ path, data: null, error: null, loading: false });
      return;
    }
    setState({ path, data: null, error: null, loading: true });
    getJson<T>(path)
      .then((data) => alive && setState({ path, data, error: null, loading: false }))
      .catch((error: Error) => alive && setState({ path, data: null, error, loading: false }));
    return () => {
      alive = false;
    };
  }, [path]);
  if (state.path !== path) return { data: null, error: null, loading: path !== null };
  return { data: state.data, error: state.error, loading: state.loading };
}
