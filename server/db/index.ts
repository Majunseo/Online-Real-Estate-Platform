import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { seed } from "./seed";

/**
 * SQLite 한 파일. Node 에 들어 있는 node:sqlite 를 쓴다 (따로 설치하지 않는다).
 * 파일 위치는 JIPTEO_DB, 없으면 .data/jipteo.sqlite. 정상본 · 결함본(dev:bugs)은 파일을 따로 쓴다.
 * 표 구조는 MIGRATIONS 에 순서대로 쌓고, PRAGMA user_version 으로 어디까지 했는지 기억한다.
 */
const MIGRATIONS: string[] = [
  // 1: 회원과 로그인 세션
  `CREATE TABLE users (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     email         TEXT    NOT NULL UNIQUE,
     name          TEXT    NOT NULL,
     password_hash TEXT    NOT NULL,
     created_at    TEXT    NOT NULL
   );
   CREATE TABLE sessions (
     token_hash TEXT    PRIMARY KEY,
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     created_at TEXT    NOT NULL,
     expires_at TEXT    NOT NULL
   );
   CREATE INDEX sessions_user ON sessions(user_id);`,

  // 2: 관심 단지 · 내 집 내놓기 · 내 계획 · 메시지 · 문의
  `CREATE TABLE favorites (
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     complex_id TEXT    NOT NULL,
     created_at TEXT    NOT NULL,
     PRIMARY KEY (user_id, complex_id)
   );
   CREATE TABLE listings (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     complex_id  TEXT    NOT NULL,
     building    TEXT    NOT NULL,
     unit        TEXT    NOT NULL,
     area_m2     REAL    NOT NULL,
     floor       INTEGER NOT NULL,
     price       INTEGER NOT NULL,
     contact     TEXT    NOT NULL,
     description TEXT    NOT NULL,
     created_at  TEXT    NOT NULL
   );
   CREATE TABLE plan_items (
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     step_id    TEXT    NOT NULL,
     done       INTEGER NOT NULL DEFAULT 0,
     memo       TEXT    NOT NULL DEFAULT '',
     updated_at TEXT    NOT NULL,
     PRIMARY KEY (user_id, step_id)
   );
   CREATE TABLE messages (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     sender     TEXT    NOT NULL,
     subject    TEXT    NOT NULL,
     body       TEXT    NOT NULL,
     created_at TEXT    NOT NULL,
     read_at    TEXT
   );
   CREATE INDEX messages_user ON messages(user_id, created_at);
   CREATE TABLE inquiries (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     kind       TEXT    NOT NULL CHECK (kind IN ('help', 'advertise')),
     user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
     name       TEXT    NOT NULL,
     email      TEXT    NOT NULL,
     phone      TEXT    NOT NULL DEFAULT '',
     company    TEXT    NOT NULL DEFAULT '',
     category   TEXT    NOT NULL DEFAULT '',
     subject    TEXT    NOT NULL,
     body       TEXT    NOT NULL,
     created_at TEXT    NOT NULL
   );`,

  // 3: 검색 저장 · 내 예산
  `CREATE TABLE saved_searches (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name       TEXT    NOT NULL,
     query      TEXT    NOT NULL,
     created_at TEXT    NOT NULL
   );
   CREATE TABLE budgets (
     user_id      INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     sido         TEXT    NOT NULL,
     sgg          TEXT,
     income       INTEGER NOT NULL,
     cash         INTEGER NOT NULL,
     monthly_debt INTEGER NOT NULL,
     rate         REAL    NOT NULL,
     years        INTEGER NOT NULL,
     updated_at   TEXT    NOT NULL
   );`,

  // 4: 최근 본 단지 (로그인한 회원만. 로그인 전에는 브라우저에만 둔다)
  `CREATE TABLE recent_views (
     user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     complex_id TEXT    NOT NULL,
     viewed_at  TEXT    NOT NULL,
     PRIMARY KEY (user_id, complex_id)
   );`,
];

const TABLES_NEWEST_FIRST = ["recent_views", "budgets", "saved_searches", "inquiries", "messages", "plan_items", "listings", "favorites", "sessions", "users"];

const file = path.resolve(process.cwd(), process.env.JIPTEO_DB ?? ".data/jipteo.sqlite");
fs.mkdirSync(path.dirname(file), { recursive: true });

export const db = new DatabaseSync(file);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

function migrate() {
  const { user_version: done } = db.prepare("PRAGMA user_version").get() as { user_version: number };
  for (let v = done; v < MIGRATIONS.length; v++) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[v]);
      db.exec(`PRAGMA user_version = ${v + 1}`);
      db.exec("COMMIT");
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  }
  return done;
}

/** 표를 모두 지우고 처음 상태(시드)로 되돌린다. POST /_reset 이 부른다 */
export function resetDb(): void {
  db.exec("PRAGMA foreign_keys = OFF;");
  for (const t of TABLES_NEWEST_FIRST) db.exec(`DROP TABLE IF EXISTS ${t}`);
  db.exec("PRAGMA user_version = 0; PRAGMA foreign_keys = ON;");
  migrate();
  seed(db);
}

// 처음 켤 때: 빈 파일이면 표를 만들고 시드를 넣는다
if (migrate() === 0) seed(db);

/** 한 묶음으로 처리 (중간에 실패하면 모두 되돌린다) */
export function transaction<T>(run: () => T): T {
  db.exec("BEGIN");
  try {
    const out = run();
    db.exec("COMMIT");
    return out;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
