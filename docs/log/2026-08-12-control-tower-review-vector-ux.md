---
date: 2026-08-12
work: 지식 검토 동선과 벡터 화면 정리
branch: byh3071-cpu/knowledge-p0-control-tower-r2
pull_request: null
---

# 지식 검토 동선과 벡터 화면 정리

## 결과

- 헤더와 문서 탭에 `지식 검토` 진입점을 추가하고 검토 패널을 기본으로 열었다.
- 모바일에서도 검토 패널이 화면 높이를 넘으면 내부 스크롤되도록 했다.
- `status 구멍`을 `정리 필요`로 바꿔 내부 용어 노출을 제거했다.
- 프로젝트 원장과 Goal 한 건의 문법 오류가 전체 프로젝트 지도를 막지 않도록 오류 경계를 보강했다.
- 프로젝트 API와 오류 화면에서 YAML 파서의 행·열 등 내부 세부 정보를 노출하지 않는다.
- 벡터 화면을 기존 warm design token으로 통일하고 Qdrant 미사용 상태에서 인제스트·검색·빈 로그를 숨겼다.
- Qdrant가 없어도 Focus Feed → NotebookLM → 검토 → Brain 흐름은 계속 사용할 수 있음을 안내한다.

## 검증

- `npm test`: 61개 통과
- `npm run typecheck`: 통과
- `npm run lint`: 오류 0, 기존 스크립트 미사용 변수 경고 2건
- `npm run build`: 통과, 기존 Turbopack 동적 파일 추적 경고 1건
- 로컬 `/api/projects`: 200, 미션 5개
- 로컬 `/api/vector/status`: 200, Qdrant·Ollama·Notion 미연결 상태 확인
- 로컬 `/api/knowledge-review`: 200, 검토 항목 4개
- `npm run vhk -- check`: 기존 파일명·경로·벡터 클라이언트 규칙 오탐/기준선 위반으로 실패. 이번 변경에서 새 비밀값이나 `any`는 추가하지 않았다.

## 제외

- `.vhk/events/check-log.jsonl`과 `logs/`는 생성물이라 커밋에서 제외했다.
- Vercel/클라우드 배포는 로컬 전용 Control Tower 범위가 아니므로 수행하지 않았다.
- 최종 모바일·데스크톱 시각 확인은 로컬 브라우저에서 사용자 확인 후 필요 시 후속 조정한다.
