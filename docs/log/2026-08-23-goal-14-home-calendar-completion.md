# Goal 14 Home·Calendar 완료 인수인계

- 날짜: 2026-08-23
- 브랜치: `byh3071-cpu/tower-workbench-20260822`
- 출처: 2026-08-22 미커밋 Goal 14 구현 + 상시 지휘자 Calendar 정책 결정
- 범위: Home 공통 작업대, 5탭 셸, Home 내부 `개요` / `캘린더` 모드, 격리 기능·시각 검증

## 결정과 구현

- Calendar 진입점을 폐기하거나 상위 탭을 추가하지 않고 Home 내부 모드 토글로 복원했다.
- 기존 5개 탭은 모바일에서 5등분해 390px 안에 모두 표시하고, Home 모드와 Calendar 주요 동작은 44px 이상으로 유지했다.
- 빠른 담기는 성공 응답의 `item.id`를 보존하며, 목록 갱신 실패 시 기존 목록과 입력 성공 사실을 숨기지 않는다.
- 피크 공개 텍스트는 문장 중간에 포함된 Windows·UNC·Unix 절대경로도 제외한다.

## Provenance

- 승인 시안: `YOHAN_OS_ROOT/docs/reference/websites/assets/yohan-control-tower-capture-context-peek-approved.png`
- 정책 근거: `docs/rfc/0001-notion-backed-common-workbench.md`
- 재개 전 변경: 2026-08-22 Goal 14 미커밋 구현
- 재개 중 변경: Calendar Home 모드, 실패 상태 보존, 경로 노출 회귀 보강, 모바일 5탭·Calendar 44px 보정, QA 증거와 VHK 게이트
- 자동 생성/관리 변경: `npm run vhk -- context`, `goal next/check/done`이 `.vhk/context.md`, `docs/state/next-task.md`, Goal 상태를 갱신할 수 있다.

## 검증

- `npm run typecheck`: PASS
- `npm run lint`: PASS (오류 0, 기존 경고 2)
- `npm test`: PASS (81/81)
- `npm run build`: PASS (기존 NFT 추적 경고 1)
- Playwright 로컬 메모리 fixture: 1280×720, 390×844, dark, 담기→갱신→피크, Calendar 키보드 전환 PASS
- 디자인 QA: `design-qa.md` Goal 14 `passed`, P0 0 · P1 0 · P2 0
- `npm run vhk -- goal check --id 14 --force`: PASS
- `npm run vhk -- goal done --id 14`: PASS, Goal 14 `DONE`
- `npm run vhk -- mission check`: PASS
- `npm run vhk -- review --id 14`: 강한 모순 없음, advisory 신뢰도 `medium` (미커밋 상태와 시각·상호작용 조건의 자동 매핑 한계)

## 기존 전역 진단

- `npm run check`는 Goal 14 변경과 무관한 기존 전역 결과로 exit 1이다: 필수 환경변수명 `YOHAN_OS_ROOT` 2건을 금지 문자열로 해석하고, 기존 vector `any` 2건과 파일명 경고 20건을 보고한다.
- Goal 14 강제 게이트와 공식 `vhk verify`는 통과했으며, 전역 진단을 고치기 위한 다른 Goal 범위 변경은 하지 않았다.
- 비밀값 검사는 최종 169개 파일에서 시크릿 0건이다. 기존 `src/app/api/search/route.ts` PAT-002 휴리스틱 1건은 경고로 유지된다.

## 사람 게이트

미커밋 diff와 `docs/design/home-common-shell/captures/`의 5개 캡처를 검토한 뒤 commit 여부를 결정한다. commit·push·PR·release는 이 세션에서 수행하지 않는다.
