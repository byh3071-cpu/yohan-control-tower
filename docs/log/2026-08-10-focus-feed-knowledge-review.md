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
- 사실 주장에 검증된 타임스탬프·근거 문구가 없으면 승인 동작을 비활성화한다.
- 누락된 Brain 경로와 빈 API 응답을 JSON 503으로 정규화해 `Unexpected end of JSON input` 오류를 제거했다.

## 근거 표시 고도화

- 핵심 요점과 주장을 분리하고, 주장은 `사실`·`해석`·`제안`으로 구분했다.
- 사실에는 검증된 타임스탬프와 짧은 근거 문구를 표시하고, 해석·제안에는 사람 판단 및 교차 검증 필요 여부를 표시한다.
- upstream `approvalReady`가 참이어도 화면에 보이는 사실 근거가 불완전하면 승인 가능 상태를 보수적으로 낮춘다.
- `없음` 불확실성 표시는 숨기고 NotebookLM source 토글의 모바일 터치 영역을 44px로 맞췄다.

## 보안 경계

- GET은 loopback, POST는 loopback 및 same-origin 요청만 허용한다.
- UUID·결정 enum allowlist, 16KiB 요청, 4,000자 메모 제한을 적용했다.
- CLI는 고정 스크립트·인자 배열·`shell: false`·명시적 cwd·제한된 출력으로 실행하고 메모는 stdin으로 전달한다.
- 문자열 alias 충돌과 타입·boolean 위조를 거절하고, 목록·주장·URL·갱신 시각에 상한을 적용한다.
- 승인 성공 응답은 `{ ok: true }`만 브라우저에 전달해 Brain 상대 경로와 내부 필드 노출을 막는다.

## 검증

- `npm test`: 59개 통과
- `npm run typecheck`: 통과
- `npm run lint`: 통과
- `npm run build`: 통과
- 모바일 390×844와 데스크톱에서 44px 터치 영역, 사실·해석·제안 구분, 타임스탬프 승인 게이트를 실데이터로 확인했다.
- `npm run vhk -- goal check --id 13 --force`: typecheck·lint·test·build 전체 통과
- `npm run scan`: 비밀값 없음. 기존 검색 API의 PAT-002 휴리스틱 경고 1건은 이번 변경과 무관하다.

## 제외

- `.vhk/context.md`, `.vhk/events/check-log.jsonl`, `logs/`, `package-lock.json`의 생성·메타데이터 변경은 기능 커밋에서 제외했다.
- PR 생성과 배포는 별도 사람 승인 전까지 수행하지 않는다.
