---
date: 2026-08-23
work: VHK 정책 기준선 오탐 제거와 실제 집행 복구
goal: 15
---

# VHK 정책 기준선 오탐 제거와 실제 집행 복구

## 결과

- ADR-003에 따라 VHK 2.12.0 일반 검사와 프로젝트 전용 AST 검사를 `npm run vhk -- check` 한 명령으로 합성했다.
- `YOHAN_OS_ROOT`, `AbortSignal.any`, Qdrant `match.any`, `*.test.ts` 오탐을 제거했다.
- 명시적 TypeScript `any`, 운영 소스의 개인·시스템 절대경로, PascalCase 파일명은 변이 fixture에서 fail-closed로 차단된다.
- 기존 PascalCase 벡터 컴포넌트 5개를 kebab-case로 바꾸고 모든 import를 정렬했다. 파일 내용은 `vector-panel.tsx`의 import 경로 변경을 제외하고 동일하다.

## 검증

- `npm.cmd run typecheck`: PASS.
- `npm.cmd run lint`: 오류 0, 기존 Goal 1·13 생성 스크립트의 미사용 헬퍼 경고 2건.
- `npm.cmd run test`: 70/70 PASS, 신규 정책 회귀 테스트 5개 포함.
- `npm.cmd run build`: PASS. 샌드박스 첫 실행의 Google Fonts 네트워크 차단은 네트워크 허용 동일 명령에서 해소됐다.
- `npm.cmd run vhk -- check`: VHK 일반 검사와 프로젝트 전용 검사 모두 PASS.
- `npm.cmd run vhk -- sync --check`: 파생 규칙 드리프트 0.
- `npm.cmd run vhk -- verify`: typecheck·lint·test·build·secure scan 5/5 PASS.
- `npm.cmd run vhk -- goal check --id 15 --force`: ADR·파일명·합성 검사·동기화·whitespace를 포함한 Goal 전용 게이트 PASS.
- `npm.cmd run vhk -- goal done --id 15`: 동일 게이트 재통과 후 Goal 15 DONE.
- `git diff --check`: PASS.
- 적대 검토에서 ADR 상태 대소문자 판정과 이전 Goal 번호 잔존을 발견해 수정했다.

## 참고

- production build의 기존 NFT 동적 파일 추적 경고 1건은 유지되며 이번 변경과 무관하고 build를 실패시키지 않는다.
- Notion Dev Log 적재는 승인되지 않은 외부 쓰기라 수행하지 않았다.
