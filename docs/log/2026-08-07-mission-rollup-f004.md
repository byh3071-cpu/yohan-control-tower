# F004 미션 롤업 — Brain taxonomy와 로컬 Goal 연결

날짜: 2026-08-07
브랜치: `agent/control-tower-mvp`
기준선: `997be0af065e41a5b0811240dec682905c2b25df`
Goal: `goals/2-ecosystem-home-mvp.md`

## VHK 재개

- `.vhk/HARD_STOP` 없음과 Git 작업 기준선을 확인했다.
- 전역 CLI는 없었지만 공식 패키지 `@byh3071/vhk@2.12.0`을 확인해 `npx`로 같은 버전을 사용했다.
- 라우팅은 크로스레포 계약 확인과 7개 이상 파일 변경 때문에 L로 판정했다.
- Brain은 수정하지 않고 GitHub Connector로 정본을 읽기만 했다.

## 정본 검증

- `ecosystem-contract.yaml`: active v0.3.0, `modify_existing_brain_files` 금지 반영.
- `inheritance-registry.yaml`: contract v0.3.0, Control Tower tier A.
- `projects.yaml`: active v0.1.1, 부모 미션 5개와 프로젝트 배속 존재.
- ADR-013: Accepted. Task=`<repo>/goals/*.md`, 일정=Notion·Calendar, Inbox=수집, Control Tower=파생 관제 UI.

## 구현

- `yaml` 파서를 명시 의존성으로 추가했다.
- `src/lib/missions.ts`가 Brain taxonomy와 `YOHAN_REPOS_ROOT`의 정확한 레포 이름만 조인한다.
- 미클론 레포는 Task 0으로 만들지 않고 `unknown` 커버리지로 분리한다.
- Goal의 확장 status를 `byStatus`에 보존하고 Home용 active·queued·blocked·done·other 집계를 서버에서 만든다.
- `GET /api/missions`는 미설정·Setup Required·실패 상태를 구분하고 no-store 응답을 사용한다.
- 공용 TTL 캐시에 외부 스탬프 검증을 추가해 `projects.yaml` 또는 `goals/` 디렉터리 변경 시 TTL 안에도 다시 읽는다.
- Home의 임시 생태계 카드 4개를 실제 부모 미션 카드 5개로 교체했다.
- 기존 저장 테마는 유지하면서 신규 사용자의 기본값을 Light로 바꾸고 PWA theme color를 Warm Cream으로 정렬했다.

## 테스트와 시각 QA

- 미션 집계·Setup Required·잘못된 mission 참조·빈 taxonomy·캐시 스탬프·동시 요청·clear 경쟁 테스트 8개 추가.
- 기존 `src/lib/**/*.test.ts`는 Bash에서 루트 테스트를 제외해 10개만 실행했다. 루트·하위 glob을 분리해 `npm test` 29/29를 확인했다.
- `verify:docs`도 IPC를 만드는 `tsx` CLI 대신 Node `--import tsx`로 교체했고, 명시적 QA Brain 경로에서 통과했다.
- 클라우드 브라우저는 localhost를 차단했으나, 임시 로컬 Chromium과 Playwright로 실제 Next.js dev 서버를 검증했다.
- Desktop 1440×900: 가로 overflow 0, 하단 안내까지 viewport 안에 표시.
- Mobile 390×844: 가로 overflow 0, 고정 헤더와 단일 열 미션 카드 확인.
- 공통: 탭 5개, 미션 카드 5개, 미션 카드→프로젝트 탭 클릭, 콘솔 오류 0.
- QA fixture는 `/tmp`에만 만들었고 제품 데이터나 Brain 정본은 수정하지 않았다.

## VHK 완료

- Brain `core-ruleset.yaml` v0.1.5를 `VHK_RULES_FILE`로 연결해 `inject-bootstrap`과 `sync --check`를 통과했다.
- `goal check --id 2`와 `goal done --id 2`가 typecheck·lint·test·build 및 Goal 고유 검증 7개를 통과했다.
- Goal 2는 `DONE`으로 전이됐다.
- DONE 이후 보강 변경은 `goal check --id 2 --force`로 다시 검증했다.
- `goal next`는 “모든 goal 완료”를 출력했지만 `next-task.md`의 과거 Goal 1 문구를 유지해 Goal 1·2 완료로 교정하고 learning에 기록했다.

## 남은 범위

- F005 미션→프로젝트→Task 드릴다운.
- F006 정합성 lint와 Home 결함 배지.
- 실제 휴대폰 PWA·반복 일정·알림은 v1 범위 밖.
- Draft PR의 최종 머지는 사람 게이트다.
