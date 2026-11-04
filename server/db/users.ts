import type { User } from "../../shared/auth";
import { db, transaction } from "./index";

/** users 표 읽기 · 쓰기. SQL 은 이 파일 안에만 둔다 */
interface UserRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

export const toUser = (r: UserRow): User => ({ id: r.id, email: r.email, name: r.name, createdAt: r.created_at });

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
}

export function findUserById(id: number): UserRow | undefined {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as UserRow | undefined;
}

export function updateName(id: number, name: string): void {
  db.prepare("UPDATE users SET name = ? WHERE id = ?").run(name, id);
}

export function updatePasswordHash(id: number, passwordHash: string): void {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(passwordHash, id);
}

/**
 * 회원 탈퇴: 회원과 그 기록을 모두 지운다. 세션 · 관심 단지 · 매물 · 계획 · 메시지 · 검색 저장 · 예산 · 최근 본 단지는
 * 표의 ON DELETE CASCADE 로 함께 지워지고, 문의는 (비회원 문의와 같은 표라) 회원 것만 따로 지운다.
 */
export function deleteUser(id: number): void {
  transaction(() => {
    db.prepare("DELETE FROM inquiries WHERE user_id = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });
}

/** 새 회원. 이메일이 이미 있으면 null (UNIQUE 제약이 막는다) */
export function createUser(email: string, name: string, passwordHash: string): UserRow | null {
  try {
    const { lastInsertRowid } = db
      .prepare("INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)")
      .run(email, name, passwordHash, new Date().toISOString());
    return findUserById(Number(lastInsertRowid)) ?? null;
  } catch (err) {
    if (String(err).includes("UNIQUE")) return null;
    throw err;
  }
}
