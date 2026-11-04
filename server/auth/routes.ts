import type { ServerResponse } from "http";
import { normalizeEmail, validateEmail, validateName, validatePassword } from "../../shared/auth";
import { sendMessage } from "../db/member";
import { welcomeMessage } from "../db/seed";
import { createUser, deleteUser, findUserByEmail, toUser, updateName, updatePasswordHash } from "../db/users";
import { fail, json, readJson, str } from "../http";
import { requireUser, type Routes } from "../route";
import { DUMMY_HASH, hashPassword, verifyPassword } from "./password";
import { currentUser, endOtherSessions, endSession, startSession } from "./session";
import { blockedFor, clearFailures, recordFailure } from "./throttle";

const needJson = (res: ServerResponse) =>
  fail(res, 415, { error: "unsupported_media_type", message: "JSON 으로 보내 주세요." });

/** 회원가입 · 로그인 API. api.ts 의 경로 표에 그대로 합쳐진다 */
export const authRoutes: Routes = {
  /** 지금 로그인한 회원 (없으면 user: null) */
  "GET /api/auth/me": (req, res) => {
    const row = currentUser(req);
    return json(res, 200, { user: row ? toUser(row) : null });
  },

  /** 로그인 첫 단계: 가입된 이메일인지. 있으면 비밀번호 단계로, 없으면 회원가입으로 보낸다 */
  "POST /api/auth/check-email": async (req, res) => {
    const body = await readJson(req);
    if (!body) return needJson(res);
    const email = str(body.email);
    const problem = validateEmail(email);
    if (problem) return fail(res, 400, { error: "invalid_input", field: "email", message: problem });
    return json(res, 200, { exists: Boolean(findUserByEmail(normalizeEmail(email))) });
  },

  "POST /api/auth/signup": async (req, res) => {
    const body = await readJson(req);
    if (!body) return needJson(res);
    const email = normalizeEmail(str(body.email));
    const name = str(body.name).trim();
    const password = str(body.password);
    for (const [field, problem] of [
      ["email", validateEmail(email)],
      ["name", validateName(name)],
      ["password", validatePassword(password)],
    ] as const) {
      if (problem) return fail(res, 400, { error: "invalid_input", field, message: problem });
    }
    const row = createUser(email, name, hashPassword(password));
    if (!row) return fail(res, 409, { error: "email_taken", field: "email", message: "이미 가입된 이메일이에요. 로그인해 주세요." });
    const welcome = welcomeMessage(row.name);
    sendMessage(row.id, welcome.sender, welcome.subject, welcome.body);
    startSession(req, res, row.id);
    return json(res, 201, { user: toUser(row) });
  },

  "POST /api/auth/login": async (req, res) => {
    const body = await readJson(req);
    if (!body) return needJson(res);
    const email = normalizeEmail(str(body.email));
    const password = str(body.password);
    const wait = blockedFor(email);
    if (wait > 0) {
      res.setHeader("retry-after", String(wait));
      return fail(res, 429, { error: "too_many_attempts", message: `로그인을 여러 번 실패했어요. ${Math.ceil(wait / 60)}분 뒤에 다시 시도해 주세요.` });
    }
    const row = findUserByEmail(email);
    // 없는 이메일도 같은 계산을 거쳐, 응답 시간으로 가입 여부가 드러나지 않게 한다
    const ok = verifyPassword(password, row?.password_hash ?? DUMMY_HASH) && Boolean(row);
    if (!ok || !row) {
      recordFailure(email);
      return fail(res, 401, { error: "invalid_credentials", field: "password", message: "이메일 또는 비밀번호가 맞지 않아요." });
    }
    clearFailures(email);
    startSession(req, res, row.id);
    return json(res, 200, { user: toUser(row) });
  },

  "POST /api/auth/logout": (req, res) => {
    endSession(req, res);
    return json(res, 200, { ok: true });
  },

  // ── 내 계정: 이름 변경 · 비밀번호 변경 · 회원 탈퇴 ──
  "PUT /api/account/name": async (req, res) => {
    const body = await readJson(req);
    if (!body) return needJson(res);
    const row = requireUser(req, res);
    if (!row) return true;
    const name = str(body.name).trim();
    const problem = validateName(name);
    if (problem) return fail(res, 400, { error: "invalid_input", field: "name", message: problem });
    updateName(row.id, name);
    return json(res, 200, { user: toUser({ ...row, name }) });
  },

  /** 현재 비밀번호를 확인하고 바꾼다. 이 기기만 로그인을 남기고 다른 기기는 모두 로그아웃시킨다 */
  "PUT /api/account/password": async (req, res) => {
    const body = await readJson(req);
    if (!body) return needJson(res);
    const row = requireUser(req, res);
    if (!row) return true;
    const current = str(body.currentPassword);
    const next = str(body.newPassword);
    if (!checkCurrentPassword(res, row.id, row.password_hash, current)) return true;
    const problem = validatePassword(next) ?? (next === current ? "지금 비밀번호와 다른 비밀번호를 써 주세요." : null);
    if (problem) return fail(res, 400, { error: "invalid_input", field: "newPassword", message: problem });
    updatePasswordHash(row.id, hashPassword(next));
    endOtherSessions(req, row.id);
    sendMessage(row.id, "집터", "비밀번호가 바뀌었어요", "방금 비밀번호를 바꿨어요. 다른 기기에서는 로그아웃됐어요. 직접 바꾼 게 아니라면 고객센터로 알려 주세요.");
    return json(res, 200, { ok: true });
  },

  /** 회원 탈퇴. 비밀번호를 한 번 더 확인하고, 회원과 그 기록을 모두 지운다 */
  "POST /api/account/delete": async (req, res) => {
    const body = await readJson(req);
    if (!body) return needJson(res);
    const row = requireUser(req, res);
    if (!row) return true;
    if (!checkCurrentPassword(res, row.id, row.password_hash, str(body.password))) return true;
    if (body.confirm !== true) return fail(res, 400, { error: "invalid_input", message: "탈퇴 안내를 읽고 확인란에 체크해 주세요." });
    deleteUser(row.id);
    endSession(req, res);
    return json(res, 200, { ok: true });
  },
};

/**
 * 내 계정에서 쓰는 현재 비밀번호 확인. 로그인처럼 10분에 5번까지만 틀릴 수 있다 (로그인 실패 횟수와는 따로 센다).
 * 맞으면 true, 아니면 응답(401 · 429)을 보내고 false.
 */
function checkCurrentPassword(res: ServerResponse, userId: number, hash: string, password: string): boolean {
  const key = `account:${userId}`;
  const wait = blockedFor(key);
  if (wait > 0) {
    res.setHeader("retry-after", String(wait));
    fail(res, 429, { error: "too_many_attempts", field: "currentPassword", message: `비밀번호를 여러 번 틀렸어요. ${Math.ceil(wait / 60)}분 뒤에 다시 시도해 주세요.` });
    return false;
  }
  if (!verifyPassword(password, hash)) {
    recordFailure(key);
    fail(res, 401, { error: "invalid_credentials", field: "currentPassword", message: "지금 비밀번호가 맞지 않아요." });
    return false;
  }
  clearFailures(key);
  return true;
}
