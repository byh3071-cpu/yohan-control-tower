---
vhk_format: 1
type: goal
id: 14
title: Focus Feed 지식 검토·승인 UI 연결
status: DONE
priority: P0
completed: 2026-08-22
---

# Goal 14: Focus Feed 지식 검토·승인 UI 연결

## 목적

Focus Feed에서 담아 NotebookLM 근거 검사를 통과한 review 후보를 기존 Control Tower 문서 인박스에서 읽고, 내 생각을 선택적으로 적은 뒤 한 번 승인한다.

## 선행 게이트

- [x] yohan-control-tower PR #29의 최종 handoff·base commit 확인
- [x] PR #29의 Goal 1과 YohanInboxPanel·inbox-controller 계약 확인
- [x] yohan-brain PR #170 기준 확정
- [x] yohan-brain ADR-017이 Accepted
- [x] Brain Goal 18의 knowledge:reviews·knowledge:approve JSON 계약 고정

선행 게이트가 충족되기 전에는 API·UI 코드를 만들지 않는다. Goal 1 기능을 복사하거나 별도 Inbox 앱을 만들지 않는다.

## 제품 범위

- 기존 **문서 → 인박스** 안에 ‘지식 검토’ 섹션을 추가한다.
- 새 탭·새 앱·새 데이터베이스를 만들지 않는다.
- 일반 Yohan Inbox와 같은 화면·스타일·고정 CLI 실행 패턴을 재사용하되 데이터 모델과 상태 전이는 분리한다.
- Control Tower는 로컬 웹 localhost:3001에서만 동작한다.

## Task

### CT-KW-01 — 기존 Inbox 기반선 흡수

- PR #29가 머지된 최신 기준에서 Goal 1 구현을 읽는다.
- inbox-controller의 process.execPath, 고정 tsx/CLI 경로, shell:false, 고정 cwd, JSON body 상한 패턴을 재사용한다.
- generic Inbox의 CaptureEnvelope·SQLite item·PromotionReceipt를 knowledge_jobs에 적용하지 않는다.

### CT-KW-02 — 타입과 조회 API

다음 공개 UI 타입을 Control Tower 내부 타입 SoT에 추가한다.

```ts
interface KnowledgeReviewItem {
  jobId: string
  sourceType: "youtube"
  sourceUrl: string
  qualityScore: number | null
  summary: string
  keyPoints: string[]
  claims: Array<{ statement: string; citation: string | null }>
  uncertainties: string[]
  reviewPath: string
  status: "review_required"
}
```

- GET /api/knowledge-reviews는 Brain Goal 18의 knowledge:reviews --json만 호출한다.
- 성공은 items 배열, 계약 불일치는 ok:false와 안전한 오류로 반환한다.
- 브라우저·라우트가 Supabase를 직접 호출하지 않는다.
- 원문 전문·서비스 키·로컬 절대경로는 응답하지 않는다.

### CT-KW-03 — 승인 API

- POST /api/knowledge-reviews/{jobId}/approve를 추가한다.
- 요청은 confirmed=true와 선택 humanNote만 허용한다.
- humanNote는 trim 후 최대 4,000자다.
- application/json, same-origin, UUID, 요청 크기를 검증한다.
- Brain Goal 18의 knowledge:approve --approve --stdin만 고정 인자로 실행한다.
- 범용 /api/run에 액션을 추가하지 않는다.
- 성공 응답은 jobId, completed, RESOURCE·SUMMARY 상대경로만 포함한다.
- queue 상태 충돌은 409, 입력 오류는 400, brain 실행 실패는 마스킹된 5xx로 구분한다.

### CT-KW-04 — 지식 검토 화면

- YohanInboxPanel 또는 최종 PR #29의 인박스 소유 컴포넌트 안에 별도 섹션으로 넣는다.
- 카드에는 출처, 품질 점수, 짧은 요약, 불확실성 개수, 원문 링크를 표시한다.
- 상세에는 핵심 포인트, 주장·타임스탬프 근거, 불확실성, 내 생각 textarea를 표시한다.
- 사용자 버튼은 **나중에**와 **승인**만 제공한다.
- 나중에는 서버 상태를 만들지 않고 현재 선택만 닫는다.
- 승인은 확인 대화상자를 거쳐 POST하고, 성공하면 목록을 새로고침해 후보를 제거한다.
- action_required는 승인 후보로 위장하지 않고 Focus Feed에서 확인하도록 안내한다.

### CT-KW-05 — 실패·접근성

- Brain CLI 미설정·시간초과·계약 불일치·부분 산출물을 빈 목록으로 숨기지 않는다.
- 로딩·빈 상태·오류·성공 메시지를 각각 구분한다.
- 키보드만으로 카드 열기, textarea, 승인 확인, 닫기가 가능해야 한다.
- 360px에서 내용이 잘리지 않게 하되 P0 모바일 원격접속은 지원하지 않는다.

### CT-KW-06 — 문서·검증

- 구현과 함께 docs/PRD.md에 F011 지식 검토를 추가한다.
- docs/ARCHITECTURE.md에 전용 API, brain CLI 위임, 일반 Inbox와 큐 분리, 보안 경계를 기록한다.
- npm test, npm run typecheck, npm run build와 저장소 보안 게이트를 통과한다.
- API 단위 테스트와 로컬 브라우저 1440px 검증을 남긴다.

## 완료 조건

- [x] 새 탭 없이 문서 인박스에서 지식 후보가 보인다.
- [x] 요약·근거·품질·불확실성·내 생각을 한 화면에서 확인한다.
- [x] 빈 내 생각과 4,000자 내 생각 승인이 모두 동작한다.
- [x] 승인 후 brain 파일 2개와 queue completed가 같은 성공을 의미한다.
- [x] 서비스 키·humanNote가 URL·argv·브라우저 로그에 나타나지 않는다.
- [x] 일반 Inbox Goal 1의 큐·승인 흐름이 회귀하지 않는다.
- [x] Notion API를 호출하지 않는다.

> 완료 증거와 현행 승인 계약은 Goal 13 및 `docs/log/2026-08-23-focus-feed-knowledge-review-proof.md`에서 이어서 관리한다.

## 악수

Control Tower의 ‘승인 완료’ 메시지는 Brain CLI가 RESOURCE·SUMMARY를 검증하고 knowledge_jobs를 completed로 전이한 성공 결과와 같아야 한다.

## 비범위

- Focus Feed 캡처 UI 수정
- Brain worker·NotebookLM 품질 로직 수정
- generic Inbox와 knowledge_jobs 통합
- 새 탭·모바일 원격접속·클라우드 배포
- Notion·wiki·허브 자동 반영
- 키 교체·배포·머지

## 코딩 에이전트 시작 프롬프트

```text
AGENTS.md·RULES.md와 goals/14-focus-feed-knowledge-review-ui.md를 읽고,
yohan-brain/docs/specs/KNOWLEDGE-WORKFLOW-P0-AGENT-PLAN.md의 인터페이스를 정본으로 사용해.
PR #29·Brain Goal 18·ADR-017 선행 게이트가 실제로 끝났는지 먼저 확인해.
Goal 1의 YohanInboxPanel과 고정 CLI 실행기를 재사용하되 큐·타입은 합치지 마.
CT-KW-01부터 순서대로 구현하고 새 탭·Notion·Supabase 직접 호출을 만들지 마.
테스트·브라우저 검증·독립 검수 결과를 보고하고 PR 전에서 멈춰.
```
