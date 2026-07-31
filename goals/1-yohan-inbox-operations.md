---
vhk_format: 1
type: goal
id: 1
title: 요한 인박스 운영 화면 연결
status: IN_PROGRESS
priority: P0
---

# Goal 1: 요한 인박스 운영 화면 연결

## 배경

모바일·CLI에서 수집한 자료를 로컬 인박스 큐에서 보고, 사람의 결정 뒤에만 brain 정본으로 승격할 수 있어야 한다. 관제탑은 새 정제 엔진을 소유하지 않고 yohan-brain CLI 계약을 안전하게 호출하는 운영 화면만 소유한다.

## 범위

- 기존 문서 탭의 인박스 표면 안에 빠른 수집과 처리 큐를 배치한다.
- 전용 API가 yohan-brain CLI의 닫힌 명령만 shell 없이 실행한다.
- 결정 저장과 정본 승격을 서로 다른 사람 동작으로 유지한다.
- 기존 SoT 초안 패널은 보조 도구로 접어 보존한다.

## 비범위

- 새 여섯 번째 탭
- AI 자동 정제·OCR·플랫폼 보관함 해제
- 인증·스케줄러·배포·클라우드 릴레이
- brain 기존 파일 수정 또는 스킬 자동 설치

## Completion Check

- [ ] 빠른 수집이 CaptureEnvelope.v1로 enqueue되고 항목 ID가 보인다.
- [ ] 활성 건수와 단계·상태가 처리 큐에 보이며 실패가 0건으로 위장되지 않는다.
- [ ] 사람 결정 저장 뒤 별도 승인 동작으로만 정본 승격이 실행된다.
- [ ] POST는 same-origin, 닫힌 action·disposition, UUID 검증을 통과해야 한다.
- [ ] CLI는 process.execPath + 고정 tsx/CLI 경로 + shell:false + 고정 cwd로만 실행된다.
- [ ] npm test, npm run typecheck, npm run build가 통과한다.

## 악수

관제탑의 정본 승격 성공 응답은 brain CLI가 PromotionReceipt.v1을 기록하고 해당 항목을 completed/promoted로 바꾼 결과와 같은 뜻이어야 한다.
