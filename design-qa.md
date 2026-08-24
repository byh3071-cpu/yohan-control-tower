# Goal 13 디자인 QA

- 날짜: 2026-08-22
- 대상: 문서·검토 > Focus Feed 지식 검토
- final result: passed
- 현재 결함 수: P0 0 · P1 0 · P2 0

## 최신 사용자 피드백에서 재개된 결함

| 심각도 | 결함 | 구현 결과 |
| --- | --- | --- |
| P1 | 주장 유형·상태·본문·인용문의 위계와 열 정렬이 약함 | 데스크톱 9.5rem 메타 열, 모바일 단일 열, 본문 16/28px, 인용 14/24px로 보정 |
| P1 | 제목·부제목·본문의 강약이 약해 첫 시야 전달력이 낮음 | H1 20~24px, H2 20px, 섹션 제목 18px, 본문 16px로 역할 분리 |
| P1 | 승인 뒤 `승인했습니다.`로 끝나 산출물과 다음 행동을 알 수 없음 | 공개 영수증, Focus Feed→사람 승인→RESOURCE→SUMMARY 4단계 배선, 실제 인사이트 열기, 다음 검토 CTA 구현 |
| P2 | 사실·해석·제안 수가 모두 노출되어 밀도가 높음 | 검증된 근거·확인 필요 근거·해석·적용 제안을 사실대로 분리하고 0건 유형은 숨김 |
| P2 | 긴 본문 폭이 읽기 집중을 떨어뜨림 | 요약·핵심 요점·주장·인용을 72ch로 제한 |

## 검수 결과

| 화면·상태 | 뷰포트 | 결과 | 증거 |
| --- | --- | --- | --- |
| 목록 + 최근 승인 배선, light | 1280×720 | PASS | `docs/design/knowledge-review/captures/01-list-recent-flow-1280x720.png` |
| 주장과 근거 위계, light | 1280×720 | PASS | `docs/design/knowledge-review/captures/02-claims-hierarchy-1280x720.png` |
| 목록 + 최근 승인 배선, mobile | 390×844 | PASS | `docs/design/knowledge-review/captures/03-list-recent-flow-mobile-390x844.png` |
| 주장과 근거 위계, mobile | 390×844 | PASS | `docs/design/knowledge-review/captures/04-claims-hierarchy-mobile-390x844.png` |
| 목록 + 최근 승인 배선, dark | 1280×720 | PASS | `docs/design/knowledge-review/captures/05-list-recent-flow-dark-1280x720.png` |
| 실제 승인 인사이트 열기 | 1280×720 | PASS | `docs/design/knowledge-review/captures/06-approved-insight-open-1280x720.png` |

## 기능·접근성 확인

- 가로 넘침 검사: 1280px와 390px 모두 `scrollWidth === innerWidth`.
- 상단 제목·부제목·닫기 버튼은 지식 검토 스크롤 밖에 유지된다.
- 다음 검토 이동은 지식 검토 컨테이너만 스크롤해 상위 고정 헤더를 밀지 않는다.
- 최근 승인 CTA는 실제 `knowledge-<job-id>` 인사이트 문서를 열었다.
- 상태는 아이콘·문구를 함께 써서 색만으로 전달하지 않는다.
- 공개 영수증은 내부 경로·해시를 포함하지 않는다.
- 실제 승인·보류·거절 버튼은 QA 중 추가로 클릭하지 않았다.

## 적대검수 루프

| 검수 | 발견 | 조치 | 재판정 |
| --- | --- | --- | --- |
| 독립 시각·코드 검수 | P0 1 · P1 3 · P2 2 | 부분 산출물 완료 과장, 연결 실패, 다음 포커스, 최신 승인 선택, reduced-motion을 보정 | P0 0 · P1 0 · P2 0 |
| Claude strong 3차 | P1 1 · P2 1 | 검증된 fact 집계와 검토 목록 조회 실패/실제 완료 상태를 분리 | Claude strong 4차 P0 0 · P1 0 · P2 0 |

## 완료 게이트

- typecheck: PASS
- lint: PASS (기존 Goal 검사 스크립트 경고 2건, 오류 0건)
- test: PASS (73/73)
- build: PASS
- VHK 보안 스캔: 시크릿 0건, 기존 `src/app/api/search/route.ts` PAT-002 휴리스틱 1건
- 문서 경로 검증: PASS

---

# Goal 14 디자인 QA

- 날짜: 2026-08-23
- 대상: 공통 셸 · Home 공통 작업대 · Home 내부 Calendar 모드
- 상태: 구현·격리 기능 검증·시각 QA 완료
- final result: passed
- 현재 결함 수: P0 0 · P1 0 · P2 0

## 구현 범위

- 셸을 `h-dvh`와 `--app-header-height` / `--app-tabs-height` / `--app-chrome-height`로 고정하고, Home은 페이지 스크롤 대신 열 단위 독립 스크롤을 쓴다.
- Home은 빠른 담기 → GET `/api/inbox` 최근 활성 항목 → 컨텍스트 피크로 이어진다. 담기 성공 후 응답 `item.id`만 선택하며 `items[0]` 가정을 쓰지 않는다.
- 피크는 제목·발췌·출처/상태·요약·핵심점/불확실성 중 실제 공개 필드만 보여 주고, 내부 절대경로·hash·relPath는 숨긴다.
- 명시 행동은 지식 검토·수집함(문서 탭) 이동만 사용한다. 자동 처리·자동 승인·Brain 쓰기는 없다.
- Calendar는 새 탭을 만들지 않고 Home의 `개요` / `캘린더` 2상태 토글로 복원했다. 5개 상위 탭은 그대로 유지한다.
- 본문 16px, 보조 14px, 주요 동작 44px, 키보드 포커스, `prefers-reduced-motion`을 코드에 반영했다.

## 정적 게이트

- typecheck: PASS
- lint: PASS (오류 0건, 기존 Goal 검사 스크립트 `must` 미사용 경고 유지)
- test: PASS (81/81, Goal 14 helper 8건 포함)
- build: PASS (Next.js 16.2.9; 기존 `next.config.ts` NFT 추적 경고 1건)
- 시각 QA: PASS

## 검수 결과

| 화면·상태 | 뷰포트 | 결과 | 증거 |
| --- | --- | --- | --- |
| 공통 작업대 기본, light | 1280×720 | PASS | `docs/design/home-common-shell/captures/01-overview-light-1280x720.png` |
| 담기→갱신→피크 선택, light | 1280×720 | PASS | `docs/design/home-common-shell/captures/02-capture-peek-light-1280x720.png` |
| 공통 작업대, mobile | 390×844 | PASS | `docs/design/home-common-shell/captures/03-overview-mobile-390x844.png` |
| Calendar 모드, mobile | 390×844 | PASS | `docs/design/home-common-shell/captures/04-calendar-mobile-390x844.png` |
| 공통 작업대 기본, dark | 1280×720 | PASS | `docs/design/home-common-shell/captures/05-overview-dark-1280x720.png` |

## 기능·접근성 확인

- Playwright는 `/api/inbox`, `/api/calendar`, `/api/docs`를 메모리 fixture로 가로채 네트워크·외부 파일 쓰기 없이 실행했다.
- 빠른 담기 POST가 반환한 `item.id`를 선택한 뒤 GET 갱신 목록의 같은 항목으로 피크가 열리고, 제목 포커스와 원문 발췌가 표시되는 것을 확인했다.
- 1280×720과 390×844에서 `scrollWidth === innerWidth`; 모바일 5탭 경계는 4–386px 안에 모두 들어오고 각 높이는 44px다.
- Home `개요` / `캘린더` 버튼은 두 뷰포트 모두 44px이며, `캘린더`에 포커스를 둔 뒤 Enter로 모드가 전환되고 `aria-pressed=true`가 됐다.
- Calendar 모바일 첫 시야의 모든 동작 버튼은 44px 이상이며 헤더·탭·제목·툴바가 서로 가리지 않는다.
- reduced-motion 에뮬레이션에서 `matchMedia`는 true, transition/animation은 `1e-05s`, scroll behavior는 `auto`였다.
- 내부 절대경로가 문장 중간에 섞인 Windows·Unix 입력도 공개 텍스트에서 제외하는 회귀 테스트가 통과했다.

## 적대검수 루프

| 검수 | 발견 | 조치 | 재판정 |
| --- | --- | --- | --- |
| 데스크톱 선택 상태 | P1 1: 피크 카드가 우측 열 전체 폭을 쓰지 않음 | `HomeContextPeek` 3상태에 `w-full` 적용 | P1 0 |
| 390px Calendar 상태 | P1 1: 5번째 탭 잘림 · P2 1: 주요 툴바 27–34px | 모바일 5등분 탭, Calendar 주요·행동 버튼 44px 적용 | P1 0 · P2 0 |
| 승인 시안 대조 + 최종 5캡처 | 따뜻한 중립색·얇은 경계·타이포 위계·2열 피크가 시안 방향과 정합 | 추가 조치 없음 | P0 0 · P1 0 · P2 0 |

## 남은 사람 게이트

- 미커밋 diff와 위 5개 캡처를 검토하고 commit 여부를 결정한다. Goal 13 증거는 변경하지 않았다.
