import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "../auth/password";
import { complexes } from "../data/complexes";

/**
 * 처음 상태에 넣어 두는 테스트 계정과 그 계정의 자료. /_reset 하면 이 상태로 돌아간다.
 * 검사기(WebTestPilot)나 사람이 로그인이 필요한 화면을 볼 때 쓴다. 실제 서비스에 올릴 때는 지운다.
 *   demo   — 관심 단지 3곳 · 계획 1단계 완료 · 메시지 2통(1통 읽음)
 *   tester — 아무것도 없는 새 계정 (환영 메시지 1통)
 */
export const SEED_USERS = [
  { email: "demo@jipteo.kr", name: "김집터", password: "jipteo1234" },
  { email: "tester@jipteo.kr", name: "이테스트", password: "tester1234" },
];

const SEED_AT = "2026-10-01T00:00:00.000Z";

export const welcomeMessage = (name: string) => ({
  sender: "집터",
  subject: `${name}님, 집터에 오신 걸 환영해요`,
  body: "관심 단지를 담아 두면 새 실거래가가 신고될 때 '새 소식'에서 알려 드려요.\n'내 계획'에서 집을 사기까지의 단계를 하나씩 체크해 보세요.",
});

export function seed(db: DatabaseSync): void {
  const insertUser = db.prepare("INSERT INTO users (email, name, password_hash, created_at) VALUES (?, ?, ?, ?)");
  const insertMessage = db.prepare("INSERT INTO messages (user_id, sender, subject, body, created_at, read_at) VALUES (?, ?, ?, ?, ?, ?)");
  const ids = SEED_USERS.map((u) => {
    const id = Number(insertUser.run(u.email, u.name, hashPassword(u.password), SEED_AT).lastInsertRowid);
    const w = welcomeMessage(u.name);
    insertMessage.run(id, w.sender, w.subject, w.body, SEED_AT, u.email === "demo@jipteo.kr" ? SEED_AT : null);
    return id;
  });

  // demo 계정: 서울 마포구에서 최근 거래가 있는 단지 3곳을 관심 단지로
  const demo = ids[0];
  const picks = complexes
    .filter((c) => c.sggCode === "11440")
    .sort((a, b) => b.latest.date.localeCompare(a.latest.date) || a.id.localeCompare(b.id))
    .slice(0, 3);
  const insertFavorite = db.prepare("INSERT INTO favorites (user_id, complex_id, created_at) VALUES (?, ?, ?)");
  picks.forEach((c) => insertFavorite.run(demo, c.id, SEED_AT));
  db.prepare("INSERT INTO plan_items (user_id, step_id, done, memo, updated_at) VALUES (?, ?, 1, ?, ?)").run(demo, "budget", "월 상환 150만 원 이내", SEED_AT);
  insertMessage.run(demo, "집터 고객센터", "관심 단지 알림을 켰어요", "관심 단지에 새 거래가 신고되면 '새 소식'에 표시돼요.", "2026-10-02T00:00:00.000Z", null);
}
