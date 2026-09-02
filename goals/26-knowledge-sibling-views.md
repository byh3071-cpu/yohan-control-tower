---
vhk_format: 1
type: goal
id: 26
title: 문서·검토 레인과 읽기·던지기 표면
status: NOT_STARTED
priority: P0
size: M
---

# Goal 26: 문서·검토 레인과 읽기·던지기 표면

## Objective

`문서·검토` 탭 안에 `검토 / 인박스 / 문서` 형제를 두고, 시안의 리스트+상세·던지기·읽기 전용 문서를 기존 knowledge-review·inbox·sot-draft API에 연결한다. 기존 brain 파일은 수정하지 않는다.

## Scope

- 시각 SoT: `docs/prototypes/four-lanes/captures/screen-2.png`–`screen-4.png`.
- 명세: `four-lanes-implementation-spec.md` §지식 형제 레인, ADR-004, ADR-001.
- `src/lib/knowledge-navigation.ts`로 `view=docs&lane=review|inbox|files` parse·serialize·canonicalize.
- `page.tsx`에서 인박스 오버레이 토글을 레인 전환으로 대체한다. `docsMode`는 `lane=files`에서만.
- 지식 검토: 좌 목록 + 우 SUMMARY. `approve`/`hold`/`reject` 매핑. `approvalReady` 아니면 승인 disabled.
- 인박스: 던지기 입력 + 분류 4버튼은 disposition만. 승격은 별도 확인. `action`이 `/api/calendar`를 호출하지 않는다.
- 문서: 기존 분류 사이드바를 daily 시각으로 칠하고 미리보기는 읽기. `+ 새 기록`은 SoT 초안 신규 저장. 시안 4폴더 택소노미는 만들지 않는다.
- 일상 표면 토큰은 Goal 25의 `daily-visual`을 재사용한다. Goal 25가 아직이면 이 Goal이 토큰 모듈을 같은 계약으로 도입할 수 있으나 일정 화면은 건드리지 않는다.

## Completion Check

- [ ] `lane` allowlist 밖 값은 `files`로 canonicalize되고 단위 테스트로 증명된다.
- [ ] 검토·인박스·문서 전환이 URL 새로고침·뒤로 가기로 복원된다.
- [ ] 지식 검토 승인/보류/거절이 기존 POST 계약만 쓰고, 승인 차단 시 approve가 비활성이다.
- [ ] 인박스 4버튼이 `knowledge|action|reference`와 확인된 `duplicate|reject` 닫힌집합만 보내며 calendar create를 호출하지 않는다.
- [ ] `+ 새 기록`이 신규 경로만 저장하고 기존 경로 409를 유지한다. 문서 미리보기에 본문 저장 컨트롤이 없다.
- [ ] 상위 탭은 5개, `이력·지원` 같은 미존재 폴더 DOM이 없다.
- [ ] 1440·768·360 overflow 0, 레인당 H1 1개.
- [ ] 기존 inbox·knowledge-review·sot-draft 테스트 회귀, typecheck, lint, test, build, `vhk goal check --id 26`가 통과한다.

## Forbidden

- `modify_existing_brain_files` 우회, 문서 인라인 에디터
- 인박스 disposition → Calendar 항목 자동 생성
- 지식 검토 재승인으로 RESOURCE·SUMMARY 덮어쓰기
- 여섯 번째 탭, 탭 라벨을 `지식·디자인`으로 개명
- 사이드바에 시안 전용 4폴더를 하드코딩
- 배포·publish·main 직 push

## Evidence Plan

- `src/lib/knowledge-navigation.ts` + 테스트
- 인박스 disposition 매핑 테스트
- 기존 inbox/knowledge-review/sot-draft route 테스트
- `docs/log/YYYY-MM-DD-knowledge-sibling-views.md`
- `scripts/check-goal-26.mjs` (`vhk goal sync` 백필)
