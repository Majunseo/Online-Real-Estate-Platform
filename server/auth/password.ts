import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

/**
 * 비밀번호는 scrypt(솔트 16바이트, 키 64바이트)로만 저장한다. 원문은 어디에도 남기지 않는다.
 * 저장 형식: scrypt$N$r$p$솔트(base64)$해시(base64) — 나중에 강도를 올려도 예전 해시를 읽을 수 있게 값을 함께 둔다.
 */
const N = 16384;
const R = 8;
const P = 1;
const KEY_LEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, KEY_LEN, { N, r: R, p: P });
  return ["scrypt", N, R, P, salt.toString("base64"), hash.toString("base64")].join("$");
}

export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, n, r, p, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = scryptSync(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return timingSafeEqual(actual, expected);
}

/** 없는 이메일로 로그인할 때도 같은 시간만큼 계산해, 응답 시간으로 가입 여부를 알 수 없게 한다 */
export const DUMMY_HASH = hashPassword(randomBytes(12).toString("hex"));
