import type { IncomingMessage, ServerResponse } from "http";
import { createHash, randomBytes } from "crypto";
import { db } from "../db";
import { findUserById } from "../db/users";
import { readCookie, setCookie } from "../http";

/**
 * 로그인 상태는 HttpOnly 쿠키 하나로 들고 다닌다. 화면 스크립트는 쿠키를 읽을 수 없다.
 * DB 에는 토큰 원문이 아니라 SHA-256 값만 둔다 (DB 가 새도 그 값으로는 로그인할 수 없다).
 */
export const SESSION_COOKIE = "jipteo_session";
const DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const isHttps = (req: IncomingMessage) => req.headers["x-forwarded-proto"] === "https";

export function startSession(req: IncomingMessage, res: ServerResponse, userId: number): void {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + DAYS * 86_400_000);
  db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)").run(
    hashToken(token),
    userId,
    now.toISOString(),
    expires.toISOString(),
  );
  setCookie(res, SESSION_COOKIE, token, { maxAgeSeconds: DAYS * 86_400, secure: isHttps(req) });
}

export function endSession(req: IncomingMessage, res: ServerResponse): void {
  const token = readCookie(req, SESSION_COOKIE);
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  setCookie(res, SESSION_COOKIE, "", { maxAgeSeconds: 0, secure: isHttps(req) });
}

/** 지금 쓰는 세션만 남기고 그 회원의 다른 세션(다른 기기 · 브라우저)을 모두 끝낸다 */
export function endOtherSessions(req: IncomingMessage, userId: number): void {
  const token = readCookie(req, SESSION_COOKIE) ?? "";
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?").run(userId, hashToken(token));
}

/** 쿠키의 세션이 살아 있으면 그 회원. 만료된 세션은 이때 지운다 */
export function currentUser(req: IncomingMessage) {
  const token = readCookie(req, SESSION_COOKIE);
  if (!token) return undefined;
  const row = db.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?").get(hashToken(token)) as
    | { user_id: number; expires_at: string }
    | undefined;
  if (!row) return undefined;
  if (row.expires_at < new Date().toISOString()) {
    db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return undefined;
  }
  return findUserById(row.user_id);
}
