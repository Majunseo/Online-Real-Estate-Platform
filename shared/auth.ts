/**
 * 회원 자료 형식과 입력 규칙. 화면은 바로 안내하려고, 서버는 최종 판정으로 같은 함수를 쓴다.
 * 각 검사는 문제가 없으면 null, 있으면 화면에 그대로 보여 줄 문장을 돌려준다.
 */
export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string; // ISO
}

/** API 오류 응답. field 가 있으면 그 입력칸 아래에 message 를 띄운다 */
export interface ApiErrorBody {
  error: "invalid_input" | "email_taken" | "invalid_credentials" | "too_many_attempts" | "unauthorized" | "not_found" | "unsupported_media_type";
  message: string;
  field?: "email" | "name" | "password" | "currentPassword" | "newPassword";
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 64;
export const NAME_MAX = 20;
const EMAIL_MAX = 254;

/** 이메일은 앞뒤 공백을 빼고 소문자로 맞춰 저장 · 비교한다 */
export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export function validateEmail(email: string): string | null {
  const e = normalizeEmail(email);
  if (!e) return "이메일 주소를 입력해 주세요.";
  if (e.length > EMAIL_MAX || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(e)) return "이메일 주소 형식이 올바르지 않아요.";
  return null;
}

export function validateName(name: string): string | null {
  const n = name.trim();
  if (!n) return "이름을 입력해 주세요.";
  if (n.length > NAME_MAX) return `이름은 ${NAME_MAX}자까지 쓸 수 있어요.`;
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`;
  if (password.length > PASSWORD_MAX) return `비밀번호는 ${PASSWORD_MAX}자까지 쓸 수 있어요.`;
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "비밀번호에 영문과 숫자를 모두 넣어 주세요.";
  return null;
}
