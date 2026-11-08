# 집터 (jipteo)

국토교통부 아파트 매매 실거래가를 지도에서 찾아보는 부동산 사이트입니다.
웹 테스트 에이전트(WTP)의 결함 탐지 능력을 평가하기 위한 **테스트용 사이트**로 만들었습니다.
단지 · 가격 · 거래는 실제 공공데이터이고, 중개사무소 목록은 화면 확인용 가상 자료입니다.

## 주요 기능

| 화면 | 내용 |
|---|---|
| 매매 검색 (`/search`) | 시도 → 시군구 → 동 경계를 눌러 들어가는 지도, 지역 묶음 말풍선 · 단지 가격 핀, 가격 · 면적 · 준공 연도 · 세대수 조건, 역세권 · 학교 근처 조건, 검색 저장 |
| 단지 상세 (`/complex/:id`) | 면적별 가격 흐름 · 거래 내역, 건축물대장(세대수 · 동수 · 최고층 · 주차), 가까운 역 · 학교, 네이버 거리뷰(촬영일 표시, 누른 쪽으로 이동) |
| 실거래가 (`/deals`) | 지역 · 기간 · 최고가 경신 · 계약 해제 조건, 최근 계약순 / 가격 높은 순 |
| 첫 화면 | 내 위치 주변 단지(허용한 경우) 또는 요즘 거래가 많은 단지, 최근 본 단지 주변 추천, 내 예산으로 살 수 있는 단지 |
| 대출 · 예산 | 대출 계산, 주택담보대출 금리, 내 예산(DSR · LTV) 계산 |
| 회원 | 회원가입 · 로그인, 내 계정(이름 · 비밀번호 변경, 탈퇴), 관심 단지, 새 소식, 내 계획, 메시지, 내 집 내놓기 |
| 고객센터 | 자주 묻는 질문, 1:1 문의 · 광고 문의와 내 문의 조회 |

## 실행

Node.js **24 이상**이 필요합니다 (내장 `node:sqlite` 와, 타입스크립트 스크립트를 그대로 실행하는 기능을 씁니다).

```sh
npm install
cp .env.example .env     # 값을 채운다 (아래 "환경 변수")
npm run dev              # http://127.0.0.1:8094
```

화면과 API 가 한 포트에서 돕니다 (API 는 Vite 플러그인 `server/vite-plugin-api.ts`).
회원 DB 는 처음 켤 때 `.data/jipteo.sqlite` 에 만들어지고 테스트 계정이 들어갑니다.

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 정상본 (포트 8094) |
| `npm run dev:bugs` | 결함본 (포트 8095, 결함을 모두 켜고 DB 파일을 따로 쓴다) |
| `npm run typecheck` | 타입 검사 |
| `npm run build` / `npm run preview` | 배포용 빌드 / 빌드 결과 미리 보기 |

### 테스트 계정

| 이메일 | 비밀번호 | 이름 |
|---|---|---|
| demo@jipteo.kr | jipteo1234 | 김집터 (관심 단지 · 계획 · 메시지가 들어 있음) |
| tester@jipteo.kr | tester1234 | 이테스트 |

### 테스트용 API

```
GET  /api/bugs    지금 켜진 결함 ID 목록
GET  /gt.json     정답지 (결함 레지스트리에서 만든다)
POST /_reset      DB 를 처음 상태(시드)로 되돌린다
```

### 결함과 브랜치

결함은 코드 안에 토글(`isOn("F1")` · `bugOn("U1")`)로 들어 있고 기본은 모두 꺼진 정상 사이트다.
분야별 브랜치에서 주입해 `develop` 에 합쳤다. 증상 · 재현 절차는 [docs/bugs-injected.md](docs/bugs-injected.md).

| 브랜치 | 내용 |
|---|---|
| `main` | 정상본 (결함 레지스트리 비어 있음) |
| `feature/bugs-functional` | F1-F4 기능 결함 |
| `feature/bugs-validation` | V1-V3 입력 검증 결함 |
| `feature/bugs-routing` | N1-N2 이동 · 라우팅 결함 |
| `feature/bugs-ui` | U1-U3 UI 결함 |
| `develop` | 위 네 브랜치를 합친 결함본 (12건). `npm run dev:bugs` 로 전부 켠다 |

## 환경 변수 (`.env`)

`.env` 는 저장소에 올리지 않습니다. 이름은 `.env.example` 에 있습니다.

| 이름 | 쓰는 곳 |
|---|---|
| `VITE_NAVER_MAP_CLIENT_ID` | 네이버 지도 · 거리뷰 (화면). 네이버 클라우드에 Web 서비스 URL(`http://127.0.0.1:8094` 등)을 등록해야 한다 |
| `NAVER_GEOCODE_CLIENT_ID` · `NAVER_GEOCODE_CLIENT_SECRET` | 단지 주소 → 좌표 (`fetch:molit`, `build:stations`) |
| `MOLIT_SERVICE_KEY` · `MOLIT_ENDPOINT` | 국토교통부 아파트 매매 실거래가 (`fetch:molit`) |
| `BLD_SERVICE_KEY` · `BLD_ENDPOINT` | 국토교통부 건축물대장 표제부 (`fetch:buildings`) |

사이트를 띄우기만 할 때는 `VITE_NAVER_MAP_CLIENT_ID` 만 있으면 됩니다. 나머지는 자료를 다시 받을 때만 씁니다
(키가 없으면 지도 대신 지역 단추 화면이 나온다).

## 데이터

화면 요청마다 공공데이터 API 를 부르지 않습니다. 아래 명령으로 받은 파일을 서버가 켜질 때 한 번 읽습니다.

| 파일 | 만드는 명령 | 출처 |
|---|---|---|
| `server/data/molit/snapshot.json` (+ `geocode.json`) | `npm run fetch:molit [-- 202608 202610 \| --missing]` | 국토교통부 아파트 매매 실거래가 상세 자료 (공공데이터포털). 지금은 52개 시군구, 2026년 8~10월 계약분, 단지 8,104곳 |
| `server/data/molit/buildings.json` | `npm run fetch:buildings` | 국토교통부_건축HUB_건축물대장정보 서비스 (표제부) |
| `server/data/stations.json` | `npm run build:stations -- <역사정보 .xlsx>` | 전국도시철도역사정보표준데이터 (공공데이터포털). 좌표가 다른 지역의 같은 이름 역으로 잘못 든 역(양원역)은 주소로 다시 찾는다 |
| `server/data/schools.json` | `npm run build:schools -- <학교위치 .csv>` | 전국초중등학교위치표준데이터 (공공데이터포털, 한국교육시설안전원). XLS 로 받았으면 CSV 로 저장해서 넣는다 |
| `public/geo/` | `scripts/build-geo.ts` | 행정동 경계 [vuski/admdongkor](https://github.com/vuski/admdongkor) ver20261001 (통계청 SGIS, **CC BY 4.0**) |

- 2026년 7월 1일 출범한 전남광주통합특별시는 새 코드(12xxx)로 받습니다. 옛 광주(29) · 전남(46) 코드로는 거래가 나오지 않습니다.
- 공공데이터 API 는 하루 호출 한도가 있으니 넓은 범위를 한꺼번에 다시 받지 마세요. 건축물대장 API 는 초당 제한이 빡빡해 한 번에 하나씩 부릅니다.
- 역 · 학교까지 거리, 역세권(역 500m) · 학교 근처 조건은 모두 **직선 거리** 기준입니다.

## 폴더 구조

```
src/            화면 (React 18 · TypeScript · Tailwind)
  features/     화면별 폴더 (search · complex · deals · home · account …)
  components/   공용 컴포넌트 (지도 · 카드 · 양식 · 레이아웃)
  content/      약관 · 안내 문서
server/         API (Vite 플러그인)
  routes/       경로 표 (market · member), auth/ 회원가입 · 로그인 · 세션
  data/         실거래가 · 건축물대장 · 역 · 학교 자료와 검색 · 추천 계산
  db/           SQLite 표 구조(마이그레이션) · 시드
  bugs/         결함 레지스트리 (켜고 끄기, 정답지)
shared/         화면과 서버가 함께 쓰는 형식 · 입력 규칙 · 검색 조건
scripts/        자료 받기 · 만들기 스크립트
public/geo/     시도 · 시군구 · 행정동 경계
```

## 개인정보 · 위치

- 비밀번호는 scrypt 해시로만 저장하고, 로그인은 HttpOnly 쿠키 세션입니다.
- 현재 위치는 첫 화면에서 이용자가 허용했을 때만 약 1km 단위로 줄여 보내고 저장하지 않습니다.
  브라우저는 https 또는 localhost 에서만 위치를 주므로, `http://IP` 로 배포하면 "내 주변 단지" 는 동작하지 않습니다.
- 로그인 · 로그아웃 · 탈퇴하면 브라우저에 남은 개인 기록(최근 본 단지 · 예산 · 위치 허용 표시)을 지웁니다.
