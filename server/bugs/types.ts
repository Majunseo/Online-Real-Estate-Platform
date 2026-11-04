/** 결함 한 건의 형식. Maison · Agora 와 같은 모양을 쓴다. */

export type BugArea =
  | "functional" // 기능적    — F
  | "validation" // 입력 검증  — V
  | "routing" // 이동·라우팅 — N
  | "ui"; // UI        — U

export type BugSymptom =
  | "no_response"
  | "partial"
  | "false_result"
  | "duplicate"
  | "wrong_target"
  | "visual";

export interface Bug {
  id: string;
  area: BugArea;
  symptom: BugSymptom;
  title: string;
  description: string;
  location: string;
  reproduce: string;
  /** 그 화면의 정답을 적어 넣지 않은 범용 규칙으로 잡히는가 */
  detectable: boolean;
  needs: string[];
}
