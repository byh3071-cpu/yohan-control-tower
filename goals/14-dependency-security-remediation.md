---
vhk_format: 1
type: goal
id: 14
title: Next.js 및 npm 의존성 보안 취약점 해소
status: DONE
priority: P0
completed: 2026-08-22
---

# Goal 14: Next.js 및 npm 의존성 보안 취약점 해소

## Objective

로컬 전용 Control Tower의 직접·하위 npm 의존성을 호환 가능한 보안 수정 버전으로 갱신하고, 애플리케이션 품질 게이트를 모두 통과한다.

## Scope

- `next`, `@next/env`, `eslint-config-next`를 보안 수정 버전 `16.3.2`로 정렬한다.
- Next.js와 Tailwind CSS가 함께 사용하는 취약한 `postcss` override를 수정 버전으로 올린다.
- `npm audit fix`의 비강제 범위에서 하위 의존성 취약점을 해소한다.
- 변경 후 audit·typecheck·lint·test·build를 재검증한다.

## Completion Check

- [x] Next.js 관련 직접 의존성이 `16.3.2`로 정렬된다.
- [x] `postcss` 및 하위 의존성 취약점이 수정 버전으로 해소된다.
- [x] `npm audit` 결과가 취약점 0건이다.
- [x] typecheck·lint·test·build 게이트가 모두 통과한다.

## Forbidden

- `npm audit fix --force` 실행
- 보안 수정과 무관한 메이저 버전 업그레이드
- PR Ready·merge·배포·publish

## Evidence

- `package.json`: 직접 의존성과 `postcss` override의 수정 버전.
- `package-lock.json`: 해소된 하위 의존성 버전과 재현 가능한 설치 상태.
- `npm audit`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` 실행 결과.
- 2026-08-22 `npm audit`: 취약점 0건.
- 2026-08-22 `vhk goal check --id 14 --force`: typecheck·lint·test·build·audit 통과.
