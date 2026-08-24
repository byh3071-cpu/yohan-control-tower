# 2026-08-22 npm 의존성 보안 취약점 해소

## 결과

- `next`, `@next/env`, `eslint-config-next`를 `16.3.2`로 정렬했다.
- 전역 `postcss` override를 `8.5.15`에서 `8.5.26`으로 갱신했다.
- 비강제 `npm audit fix`로 `sharp`, `undici`, `js-yaml`, `nanoid`, `brace-expansion`, `hono`, `fast-uri` 등 하위 의존성의 취약 버전을 해소했다.
- `npm audit` 결과를 기존 11건(보통 4·높음 7)에서 0건으로 줄였다.

## 결정

- 메이저 버전 변경 가능성이 있는 `npm audit fix --force`는 사용하지 않았다.
- Next.js 16 내부의 마이너 보안 패치이므로 codemod는 적용하지 않았다.
- Goal 14 게이트에 직접 의존성 버전과 `npm audit --audit-level=low` 검사를 추가해 재발을 차단했다.

## 검증

- `npm run vhk -- goal check --id 14 --force`: PASS
- `npm run vhk -- verify`: typecheck·lint·test·build·secure scan 모두 PASS
- `npm audit`: 취약점 0건
