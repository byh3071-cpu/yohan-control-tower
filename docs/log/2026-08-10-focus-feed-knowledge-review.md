---
date: 2026-08-10
work: Focus Feed 지식 검토 연결
branch: byh3071-cpu/knowledge-p0-control-tower-r2
pull_request: null
---

# Focus Feed 지식 검토 연결

## 결과

- `Documents → Inbox`에 Focus Feed 지식 검토 섹션을 연결했다.
- 원본 링크, NotebookLM 근거, 주장·타임스탬프, 품질 경고를 표시한다.
- 승인, 메모와 함께 승인, 보류, 거절을 yohan-mcp CLI에 위임한다.
- 타임스탬프가 없는 주장이 있으면 승인 동작을 비활성화한다.
- 누락된 Brain 경로와 빈 API 응답을 JSON 503으로 정규화해 `Unexpected end of JSON input` 오류를 제거했다.

## 보안 경계

- GET은 loopback, POST는 loopback 및 same-origin 요청만 허용한다.
- UUID·결정 enum allowlist, 16KiB 요청, 4,000자 메모 제한을 적용했다.
- CLI는 고정 스크립트·인자 배열·`shell: false`·명시적 cwd·제한된 출력으로 실행하고 메모는 stdin으로 전달한다.

## 검증

- `npm test`: 53개 통과
- `npm run typecheck`: 통과
- `npm run lint`: 통과(기존 경고 1개)
- `npm run build`: 통과(기존 Turbopack 경고 1개)
- 모바일 390×844에서 44px 터치 영역, 하단 고정 액션, 타임스탬프 승인 게이트를 실데이터로 확인했다.
- VHK 형식 검사는 기존 `any` 오탐과 `*.test.ts` 명명 규칙 때문에 실패했으며, 이번 변경에서 새 정책 위반은 추가되지 않았다.

## 제외

- `.vhk/context.md`, `.vhk/events/check-log.jsonl`, `logs/`, `package-lock.json`의 생성·메타데이터 변경은 기능 커밋에서 제외했다.
- PR 생성과 배포는 별도 사람 승인 전까지 수행하지 않는다.
