---
id: ADR-003
date: 2026-08-23
status: accepted
tags: [vhk, policy, lint, typescript, naming]
---

# ADR-003: VHK 일반 검사와 프로젝트 전용 정책 검사를 합성한다

## 상태 (Status)

Accepted

## 맥락 (Context)

VHK 2.12.0의 `vhk check`는 `RULES.md`에서 금지 키워드 앞의 마지막 백틱 토큰을 뽑아 소스의 단순 문자열로 검색한다. 그 결과 필수 환경변수 `YOHAN_OS_ROOT`, 표준 API `AbortSignal.any`, Qdrant 연산자 `match.any`를 TypeScript `any` 또는 절대경로 위반으로 오인한다.

파일명 검사는 확장자 하나만 제거한 이름 전체를 kebab-case 정규식으로 검사해 `calendar.test.ts` 같은 역할 접미사를 위반으로 본다. 반면 PascalCase 벡터 컴포넌트 5개는 실제 프로젝트 규칙 위반이다. 현재 `vhk check`는 오탐과 실제 위반을 합쳐 21건으로 보고해 정책 게이트로 신뢰할 수 없다.

이 결정은 VHK 패키지를 수정하거나 규칙을 완화하지 않고, 프로젝트의 단일 명령 표면에서 일반 검사와 문맥 인식 검사를 함께 집행하는 방법을 정한다.

## 결정 동인

- `npm run vhk -- check`라는 기존 운영 명령을 유지해야 한다.
- 재설치 때 사라지는 node_modules patch를 금지한다.
- 오탐을 없애기 위해 실제 정책을 비활성화해서는 안 된다.
- 테스트 역할 접미사와 TypeScript AST 문맥을 구분해야 한다.
- 실패 시 변경을 되돌려 기존 VHK 동작으로 복구할 수 있어야 한다.

## 결정 (Decision)

1. `RULES.md`의 정책 의미는 유지하되 VHK 2.12.0이 잘못된 자동 규칙으로 추출하는 문장 구조를 분리한다.
2. 프로젝트 전용 결정론 검사기를 추가해 다음을 문맥 기반으로 검사한다.
   - TypeScript AST의 `AnyKeyword`를 명시적 `any`로 판정한다. 속성명과 메서드명 `any`는 허용한다.
   - 운영 소스의 문자열 리터럴에서 개인·시스템 절대경로를 차단한다. 테스트 fixture의 경로 예시는 운영 하드코딩과 분리한다.
   - 파일명에서 `.test` 역할 접미사를 제거한 기본 이름에 kebab-case를 적용한다.
3. `scripts/run-vhk.mjs`는 최상위 `check` 실행에서 VHK 일반 검사와 프로젝트 전용 검사를 모두 실행하고, 하나라도 실패하면 non-zero로 종료한다.
4. 실제 규칙 위반인 PascalCase 벡터 컴포넌트 5개는 파일과 import를 kebab-case로 바꾼다.
5. 프로젝트 전용 검사에는 통과 fixture와 세 종류의 실패 변이 fixture를 둬 규칙 문구 변경이 집행력 약화로 이어지지 않음을 증명한다.

## 대안 (Alternatives)

1. **현재 21건을 기준선 예외로 인정** — Goal은 닫을 수 있지만 새 위반도 같은 목록에 숨으므로 기각한다.
2. **node_modules의 VHK parser를 직접 수정** — 즉시 정확해지지만 재설치·다른 PC에서 사라지고 프로젝트 고정 버전과 달라져 기각한다.
3. **오탐을 만드는 코드·테스트 이름을 모두 우회 변경** — `AbortSignal.any`와 Qdrant 계약을 가독성 낮은 형태로 바꾸고 표준 `.test` 관례까지 잃으므로 기각한다.
4. **VHK upstream 수정·새 버전 업그레이드만 기다림** — 장기적으로 바람직하지만 Goal 13을 외부 릴리스에 무기한 묶으므로 후속 개선으로 남긴다.

## 결과 (Consequences)

- 장점: 운영자는 기존 `npm run vhk -- check` 한 명령으로 일반 규칙과 문맥 인식 정책을 함께 검증한다.
- 장점: `any` 속성명·테스트 접미사 같은 오탐을 제거하면서 실제 명시적 `any`·절대경로·PascalCase 위반은 차단한다.
- 비용: 프로젝트 래퍼와 전용 검사 코드·테스트를 유지해야 한다.
- 비용: VHK upstream이 같은 문제를 해결하면 중복 검사를 제거할 마이그레이션 판단이 필요하다.
- 위험: RULES 문구와 전용 검사 구현이 다시 어긋날 수 있다. 변이 fixture와 Goal 게이트로 이를 감시한다.
- 복구: `scripts/run-vhk.mjs` 합성 호출, 전용 검사 파일, RULES 문구, 파일명 변경을 단일 변경 묶음으로 되돌리면 기존 동작으로 복귀한다.

## 구현 전제조건

- 사용자가 2026-08-23 이 ADR과 구현 계획을 명시적으로 승인했다.
- Goal 15만 활성화하고 Goal 13은 정책 기준선이 green이 될 때까지 BLOCKED로 둔다.

## 남은 사람 게이트

- PR Ready 전환·merge·배포·publish
- 외부 VHK 이슈 등록·PR은 별도 승인
