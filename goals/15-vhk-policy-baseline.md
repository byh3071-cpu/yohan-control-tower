---
vhk_format: 1
type: goal
id: 15
title: VHK 정책 기준선의 오탐 제거와 실제 규칙 집행 복구
status: DONE
priority: P0
completed: 2026-08-23
---

# Goal 15: VHK 정책 기준선의 오탐 제거와 실제 규칙 집행 복구

## Objective

VHK 2.12.0의 단순 문자열·파일명 검사 오탐을 제거하되 TypeScript `any` 금지, 경로 하드코딩 금지, kebab-case 파일명 규칙의 실제 집행력을 보존해 프로젝트 정책 기준선을 green으로 만든다.

## Scope

- ADR-003의 Accepted 결정에 따라 프로젝트 전용 결정론 정책 검사를 추가한다.
- `RULES.md` 문구를 VHK 2.12.0 파서가 거짓 금지 토큰·거짓 naming 규칙으로 해석하지 않도록 분리하고 `vhk sync`로 파생 규칙을 갱신한다.
- 프로젝트 정책 검사는 TypeScript AST의 명시적 `any`, 운영 소스의 개인·시스템 절대경로 문자열, 역할 접미사(`.test`)를 제외한 kebab-case 파일명을 판정한다.
- 기존 PascalCase 벡터 컴포넌트 5개와 import를 kebab-case로 전환한다.
- `npm run vhk -- check`가 VHK 일반 검사와 프로젝트 전용 검사를 함께 집행하도록 프로젝트 래퍼를 연결한다.
- Goal 13의 정책 blocker를 해소할 Evidence를 남긴다.

## Non-Scope

- `node_modules/@byh3071/vhk` 직접 수정
- VHK 새 버전 publish·의존성 업그레이드
- 외부 GitHub Issue·PR 등록
- 런타임 기능·UI 동작·Brain 정본 변경

## Completion Check

- [x] ADR-003이 Accepted이며 결정·제약·복구 방식이 Goal 구현과 일치한다.
- [x] `YOHAN_OS_ROOT`, `AbortSignal.any`, Qdrant `match.any`, `*.test.ts`가 정책 위반으로 오인되지 않는다.
- [x] 명시적 TypeScript `any`, 운영 소스의 개인·시스템 절대경로, PascalCase 파일명 변이 fixture가 각각 fail-closed로 차단된다.
- [x] 기존 PascalCase 벡터 컴포넌트 5개와 모든 import가 kebab-case로 전환된다.
- [x] `npm run vhk -- check`가 일반 검사와 프로젝트 전용 검사 모두를 실행해 exit 0으로 통과한다.
- [x] typecheck·lint·test·build·secure scan과 `goal check --id 15 --force`가 통과한다.
- [x] Goal 13을 다시 활성화할 수 있도록 blocker와 Evidence가 갱신된다.

## Handshake

- 이전: `npm run vhk -- check`가 21건을 보고하며 실제 위반과 오탐을 구분하지 못한다.
- 이후: 같은 명령이 현재 트리에서 0건으로 통과하고, 세 종류의 위반 변이 fixture는 각각 실패한다.

## Forbidden

- 오탐을 숨기기 위한 경로·파일 단순 ignore 목록 추가
- `any`·절대경로·파일명 규칙의 의미적 완화
- node_modules patch 또는 전역 VHK 설정 변경
- Goal 15 green 전 Goal 13 강제 완료

## Evidence Plan

- `docs/adr/ADR-003-vhk-policy-enforcement.md`
- 프로젝트 전용 정책 검사 구현과 회귀 테스트
- `npm run vhk -- check` 전후 결과
- `vhk verify`, `goal check --id 15 --force`, `git diff --check`

## Evidence

- `docs/adr/ADR-003-vhk-policy-enforcement.md`: Accepted 결정, 대안, 복구 계약.
- `src/lib/project-policy.ts`: TypeScript AST 기반 명시적 `any`, 운영 소스 절대경로, kebab-case 파일명 검사.
- `src/lib/project-policy.test.ts`: 오탐 허용 1군과 fail-closed 변이 3군을 포함한 회귀 테스트 5개.
- `scripts/run-vhk.mjs`: 최상위 `check`에서 VHK 일반 검사와 프로젝트 전용 검사의 exit code 합성.
- `npm.cmd run vhk -- check`: 일반 검사와 프로젝트 전용 검사 모두 exit 0.
- `npm.cmd run vhk -- sync --check`: RULES 파생 문서와 bootstrap 드리프트 0.
- `npm.cmd run vhk -- verify`: typecheck·lint·test·build·secure scan 5/5 PASS.
- `npm.cmd run vhk -- goal check --id 15 --force`: Goal 전용 계약과 전체 게이트 PASS.
- 벡터 컴포넌트 5개의 기존 blob과 새 kebab-case 파일 blob이 import 변경을 제외하고 동일함을 hash로 확인.
