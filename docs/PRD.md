# PRD — yohan-control-tower (요한 생태계 통합 관제탑)

> 유형: 웹앱(로컬 전용 대시보드) · 포트 3001 · 정본 = 파일(`yohan-brain`), 노션은 사람용 뷰(ADR-009)
> v1 은 **v1.0(이관·통합)** 과 **v1.1(계층축)** 으로 분할한다.

## 1. 프로젝트 핵심

- **목적**: `yohan-brain`(SoT)의 문서·Task·실행기록·벡터를 **한 화면**에서 관제하고, 나아가 미션→프로젝트→Task 계층으로 파고든다.
- **사용자**: 요한 1인(비개발 오너). 로컬 머신에서 직접 연다. 외부 사용자·인증 없음.

## 2. 왜 지금

- **JTBD**: 흩어진 레포의 진행 상황을 볼 때 "지금 뭐가 어디까지 됐나"를 한 화면에서 이해하고 싶다. 사장인 내가 결정을 내려야 하고 — **사람인 내가 병목**이라서.
- **안 만들면**: 노션 AI 워크스페이스·요한 스튜디오 OS처럼 복잡성이 올라가 블랙박스가 되고 → **결국 안 쓴다**(이미 발생). 그리고 이름 충돌(`yohan-control-tower` 벡터 도구 vs `yohan-brain/dashboard` 관제 화면)이 **H-02 HIGH·"잔존"** 으로 남아 소유 경로가 결정 불가다 (`yohan-brain/docs/audits/ECOSYSTEM-MASTER-PLAN-REVIEW-2026-07-19.md:53`). **v1.0 만으로 H-02 가 해소된다.**

## 3. 기능 명세 (MVP만) — 기능ID ↔ 페이지 매핑

| ID | 단계 | 기능 | 내용 | 구현 페이지 |
|---|---|---|---|---|
| F001 | v1.0 | 문서 브라우저 이관 | 문서 목록·검색·마크다운 미리보기 이관 | 문서 |
| F002 | v1.0 | 기록·할일 뷰 이관 | 타임라인 + 실행/발행/야간 상태 카드 → 기록 / 기존 할일 목록 → 프로젝트 | 기록, 프로젝트 |
| F003 | v1.0 | 벡터 패널 흡수 | 이 레포 기존 **37파일**(컬렉션 상태·인제스트·질의 테스트)을 한 탭으로 흡수 | 벡터 |
| F008 | v1.0 | 탭 셸 정리 | 6탭 → v1.0 4탭, v1.1 에 홈 추가해 **5탭에서 동결** | 전역 셸 |
| F009 | v1.0 | 인박스(신규 문서 생성) | brain `memory/` 에 **신규 파일만** 만드는 유일한 쓰기 통로(`api/sot-draft`). 오너의 "넣는 곳 1개" 실체 | 문서 |
| F010 | v1.0 | 명령 실행(allowlist) | `api/run` allowlist **11종**: `ingest:url·ingest:all·sync:notion:push·sync:notion:pull·report:weekly·check:drift·search:memory·automation:batch·build·git:sync·bot:status`. **실행 결과는 응답으로 즉시 표시**(영속화 없음 — 신규 쓰기 경로라 v1.0 이관 원칙 밖) | 전역 셸(커맨드 팔레트) |
| F004 | v1.1 | 미션 롤업 계기판 | 부모 미션별 프로젝트 수·Task 상태 집계 API | 홈 |
| F005 | v1.1 | 3단 드릴다운 | 미션 → 프로젝트(레포) → Task(goals) | 프로젝트 |
| F006 | v1.1 | 정합성 lint 엔진 | 미션 미배정 프로젝트 / `projects.yaml` 미등재 레포 / goal frontmatter 위반. **워크트리·변형 디렉토리(`vhk-privacy-v3`·`vhk-wt-drift` 등) 제외** | 프로젝트 (결함 수 배지는 홈) |

- **AI 규칙(F009·F005·F006)**: AI 는 분류·상태변경·초안을 **제안**만. 반영·승인은 사람.
- **F010 오너 승인항**: `git:sync`(= `git pull && git push`)와 `sync:notion:push` 는 RULES.md "main 직 push·발송은 사람 게이트"와 정면으로 만난다 → **두 명령의 UI 노출 여부는 착수 전 오너가 결정**.
- **goal status 정책**: 스키마 정본 = VHK 템플릿 4값(`NOT_STARTED|IN_PROGRESS|DONE|BLOCKED`). 단 **실측상 vhk 9건·brain 4건이 확장 어휘**를 쓴다(`DEFERRED·OBSERVING·CANCELED·PR_OPEN·ACTIVE·BACKLOG`). → F006 lint 는 4값을 하드코딩하지 말고, **템플릿 4값 = 정본 / 그 밖은 `warn`(에러 아님) + 레포별 확장 허용 목록을 설정으로 수용**한다.

## 4. 데이터/상태 모델

| 모델 | 위치 | 핵심 필드 |
|---|---|---|
| Mission (L2 부모) | `brain/memory/core/projects.yaml` (**신규 파일**) | id, name, projects[] |
| Project | 동 파일 | repo, mission_id, tier, status |
| Task (Goal) | `<repo>/goals/<id>-<slug>.md` frontmatter | type, id, status, priority, title |
| Event (실행 증거) | `<repo>/.vhk/events/*.jsonl` | ts, action, channel, guard, ran, reason, agent |
| LintFinding (런타임) | 메모리 | rule, severity, target_path, message |
| Doc | `brain/memory/**`, `brain/docs/**` | 경로, 제목, status, updated |

- **L2 부모 미션 5개**: 요한 생태계 구축 / AI 1인 운영 OS / 수익 파이프라인 / 재무·투자·경영 시스템 / 삶·기반. **출처: 오너 발화(2026-07-27)** — brain 에는 아직 없다. 정본화 시점 = `projects.yaml` 생성이며 이는 **v1.1 착수 전 선행 게이트**.
- 코어 컨텍스트의 "4축(애착·돈·유통·학습)"과의 관계: 정찰 실측 결과 그 4축은 SoT 에 없다(idea-bank 국지 3축 애착·돈·유통만 존재, '학습' 축은 어느 파일에도 미발견). 따라서 **충돌이 아니라 미문서화 상태**다.
- **스캔 대상 = 로컬 클론된 레포만.** registry 45 는 목표치이지 v1 대상이 아니다. 실측: `yohan-ecosystem/` 형제 레포 **13개**, `goals/` 보유 **5개**(brain·vhk·studio·voice·control-tower — 이 중 control-tower 는 `_meta.md` 뿐). 미클론 레포는 **`unknown` 표기(0 표기 금지)**. v1.1 집계 범위는 이 로컬 실재 기준으로 재선언한다.

## 5. 기술 스택

Next.js 16.2.9 (App Router) · React 19.2.4 · TypeScript · Tailwind 4 · shadcn/ui · **recharts(차트) · gray-matter(frontmatter) · three(문서 관계뷰 — 이관 최대 무게)** · pnpm · Qdrant(localhost:6333) · Ollama(localhost:11434) · 서버 라우트에서 로컬 파일시스템 직접 읽기(DB 없음).

## 6. 메뉴 구조 (진입점 = 탭바)

- **v1.0 (4탭)**: `프로젝트 · 문서 · 기록 · 벡터`
- **v1.1 (5탭·동결)**: `홈 · 프로젝트 · 문서 · 기록 · 벡터` — **6번째 탭 추가 금지.**

## 7. 사용자 여정

- **v1.0**: 앱 실행(3001) → 기본 탭 **프로젝트**(할일 목록)로 "지금 뭐 하나" 확인 → 근거는 **문서**(읽기 + 인박스 투입), 무슨 일이 있었나는 **기록**, 검색 품질이 의심되면 **벡터**. 명령은 어느 탭에서나 커맨드 팔레트로.
- **v1.1**: 기본 탭이 **홈**으로 바뀜 → 미션 롤업·정합성 결함 수를 훑고 → 미션 카드 클릭 → **프로젝트**에서 레포→Task 드릴다운.

## 8. 페이지별 상세

| 페이지 | 역할 | 사용자 행동 | 진입 조건 | 구현 기능ID |
|---|---|---|---|---|
| 전역 셸(탭바·커맨드 팔레트) | 네비 + 전역 검색 + 명령 실행 | 탭 전환, 검색, allowlist 명령 실행 | 앱 실행 시 항상 | F008, F010 |
| 프로젝트 | v1.0 할일 목록 → v1.1 미션→레포→Task 드릴다운·lint | 계층 펼침, Task 확인, 제안 승인/기각 | **v1.0 기본 진입 탭** / 홈 미션 카드 | F002, F005, F006 |
| 문서 | brain 문서 탐색·미리보기 + 인박스 투입 | 검색, 열람, 새 문서 초안 생성 | 탭 클릭 / Task 참조 링크 | F001, F009 |
| 기록 | 실행 타임라인·상태 카드 | 기간 훑기, 이벤트 상세 열기 | 탭 클릭 | F002 |
| 벡터 | Qdrant 컬렉션 상태·인제스트·질의 테스트 | 인제스트 실행, 질의 입력 | 탭 클릭 (Qdrant·Ollama 기동 시) | F003 |
| 홈 (v1.1) | 미션 롤업·결함 수 한 눈에 | 미션 카드 클릭 → 프로젝트 | **v1.1 기본 진입 탭** | F004, F006(배지) |

> URL 경로는 구현 단계에서 결정. 여기선 페이지 이름만 확정.

## 9. v1 OUT (명시적 제외 — 스코프 크립 차단)

- **AI 토큰비/재무 계기판** (구 F007) — `.vhk/events/*.jsonl`·`receipt-log.jsonl`·`drift-log.jsonl` 에 토큰·비용 필드가 **0개**라 데이터 출처 자체가 재설계 대상. 재무축은 v1 핵심 아님.
- 스킬·멀티벤더 스택 관리축
- 일정·캘린더축 (노션 337행 마이그레이션)
- 에이전트 자동 갱신 배선 (전역 Stop hook · GitHub Actions)
- 모바일 원격접속 (Tailscale + PWA)
- 노션 가계부 연결

## 10. 하드 제약

- **로컬 전용**: Qdrant·Ollama·로컬 파일시스템 의존 → 클라우드 배포 불가. 인증 없음(로컬 바인딩 전제).
- **`YOHAN_REPOS_ROOT` 필수**: 형제 레포 스캔의 루트 경로 env. 미설정이면 레포·Task 집계는 **하드 실패**(빈 목록으로 위장 금지).
- **탭 상한 5**: 6탭 + 신규가 쌓이면 "복잡해서 안 쓰게 된 상태"가 재현된다. 확장은 탭 추가가 아니라 흡수·삭제로.
- **brain 읽기 자유 + 신규 파일 생성만**: 기존 brain 파일 수정 금지 — **RULES.md 자체 규칙(계약 조항 아님)**. 계약화는 게이트 ① 에 포함. F009 인박스와 `projects.yaml` 은 신규라 허용.
- **착수 전 선행 게이트 ①(계약 갱신 — 사람 승인 커밋)**: `ecosystem-contract.yaml` 의 `roles.control_tower` 전면 개정 + `roles.brain.hosts:[dashboard]` 제거 + **`control_tower.must_not: modify_existing_brain_files` 신설** + `inheritance-registry.yaml` 의 `yohan-brain-dashboard` 엔트리 제거·control-tower **tier B→A**. 이거 없이 코딩하면 계약 위반 상태로 진행된다.
- **착수 전 선행 게이트 ②(v1.1 한정)**: 미션 taxonomy 확정 = `projects.yaml` 생성.
- **이관 전제**: "import 무수정 이관"은 deps **15종 선설치 이후에만** 참 — `gray-matter·recharts·shadcn·three·@react-three/fiber·@react-three/drei·react-markdown·remark-gfm·@base-ui/react·lucide-react·class-variance-authority·clsx·tailwind-merge·tw-animate-css·@tailwindcss/typography`.
- **AI 는 제안만**, 승인은 사람. F010 의 `git:sync`·`sync:notion:push` 는 오너 승인 전 비노출.

## 11. 성공 지표 [오너 판정 대기]

> 지표는 확정 안 함. 아래에서 고르거나 교체할 것. (아래 **완료 정의**는 지표가 아니라 착수·종료 판정선이다.)

- **v1.0 완료 정의**: H-02 해소 + 기존 6탭 기능 무손실 이관 + 4탭 기동.
- **lint 수확량** (v1.1·F006 으로 측정): 분자 = lint 결함 중 실제 수정된 건수, 분모 = 직전 실행 대비 신규 검출 건수(lint 재실행 diff 로 근사).
- **실사용 빈도(주 N회)**: 후보로 남기되 — **측정하려면 세션 로그 기능 추가 필요**(현재 어느 기능ID에도 없음).
- ~~노션 대체율~~ **폐기**: 분모(노션에서 확인한 횟수)가 관측 불가.

---

### 정합성 self-check (통과)

① 기능→표면: F001~F006·F008~F010 **9개 전부** 페이지 매핑(§3 = §8 일치). F007 은 §9 로 이동, 잔존 참조 0. ② 표면→진입점: v1.0 은 프로젝트(기본)·문서·기록·벡터, v1.1 은 홈(기본) 추가 — 기본 진입 탭이 단계별로 정확히 1개. 전역 셸은 진입점 자체. ③ 역참조: 6개 표면 각각 기능ID ≥1 — 셸(F008·F010)·프로젝트(F002·F005·F006)·문서(F001·F009)·기록(F002)·벡터(F003)·홈(F004·F006). ④ 고아: 없음. 단계별로도 v1.0 4탭 전부 v1.0 기능 보유(프로젝트 F002·문서 F001,F009·기록 F002·벡터 F003), v1.1 신규 탭 홈은 v1.1 기능 보유.
