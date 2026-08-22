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
