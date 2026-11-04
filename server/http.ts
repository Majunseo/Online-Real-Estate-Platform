import type { IncomingMessage, ServerResponse } from "http";
import type { ApiErrorBody } from "../shared/auth";

export function json(res: ServerResponse, status: number, body: unknown): true {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(body));
  return true;
}

export const fail = (res: ServerResponse, status: number, body: ApiErrorBody) => json(res, status, body);

const BODY_LIMIT = 16 * 1024;

/**
 * JSON 본문을 읽는다. Content-Type 이 application/json 이 아니면 null.
 * (다른 사이트의 <form> 은 이 형식으로 보낼 수 없으므로, 쿠키 SameSite=Lax 와 함께 CSRF 를 막는다)
 */
export async function readJson(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) return null;
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > BODY_LIMIT) return {};
    chunks.push(chunk as Buffer);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

export const str = (v: unknown) => (typeof v === "string" ? v : "");

export function readCookie(req: IncomingMessage, name: string): string | undefined {
  for (const part of String(req.headers.cookie ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

export function setCookie(res: ServerResponse, name: string, value: string, opts: { maxAgeSeconds: number; secure: boolean }): void {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${opts.maxAgeSeconds}`];
  if (opts.secure) parts.push("Secure");
  res.setHeader("set-cookie", parts.join("; "));
}
