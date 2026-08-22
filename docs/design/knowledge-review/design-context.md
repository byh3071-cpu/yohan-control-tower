# 지식 검토 DesignContext

- context version: `2026-08-22.2`
- 상태: 구현 완료, 최종 적대 검수 대기
- 소유 저장소: `yohan-control-tower`
- 작업 브랜치: `byh3071-cpu/tower-workbench-20260822`
- 디자인 오너·최종 승인자: 요한
- 제품 표면: `문서·검토 > 지식 검토`
- 위험도: 로컬 전용 읽기·사람 승인 UI. 내부 파일 경로·해시·비공개 원문은 브라우저에 공개하지 않는다.

## 목표와 사용자 작업

요한이 Focus Feed에서 도착한 자료를 빠르게 훑고, 요약과 핵심 요점에서 논지를 잡은 뒤, 주장별 근거를 검토하고 사람 결정을 남긴다. 승인 뒤에는 작업이 끝났다는 문장만 보이는 것이 아니라 어떤 산출물이 생겼고 어디로 이어지는지 이해하며 실제 인사이트 문서를 열거나 다음 검토로 이동할 수 있어야 한다.

## 확정된 디자인 취향

1. 제목·부제목·본문의 강약이 첫 시야에서 구분되어야 한다.
2. 주장 행은 유형·근거 상태·주장·인용문의 열과 줄 간격이 정돈되어야 하며 타임스탬프가 어색하게 줄바꿈되면 안 된다.
3. 내부 ID, 설명 없는 배지, 원시 처리 단계, 품질 경고 숫자처럼 판단에 직접 필요하지 않은 정보는 기본 화면에서 제거한다.
4. 초록색은 검증 완료·승인 가능처럼 신뢰 상태에만 제한한다. 본문 구조는 색상 카드가 아니라 크기·굵기·간격·구분선으로 만든다.
5. 승인 후에는 `사람 승인 → RESOURCE → SUMMARY → 인사이트 열기/다음 검토`의 인과관계와 다음 행동이 보여야 한다.

## 금지 패턴

- `승인했습니다.` 한 줄로 끝나는 막다른 성공 상태
- 14px 미만 본문, 낮은 대비로 증거를 숨기는 보조 텍스트
- 의미가 겹치는 상태 배지와 내부 식별자 노출
- 승인 API의 파일 경로·해시·시크릿을 브라우저 응답으로 반환
- 실제 대상이 없는 죽은 링크나 가짜 아이콘
- 내부 스크롤 이동 때문에 상단 제목·닫기 버튼이 가려지는 동작

## 기존 시스템과 기준

- Next.js 16, React 19, Tailwind CSS 4, 기존 shadcn 토큰을 유지한다.
- 아이콘은 프로젝트의 `lucide-react`만 사용한다.
- 본문 16px/28px, 보조 14px/24px, 섹션 제목 18px 이상을 기준으로 한다.
- 본문 폭은 약 72자를 상한으로 두고, 390px과 1280px에서 가로 넘침이 없어야 한다.
- 저장된 기준 문서: `yohan-brain/docs/reference/websites/ai-workspace-context-trust-navigator.md`
- 승인된 디자인 기준 이미지: `yohan-brain/docs/reference/websites/assets/yohan-control-tower-capture-context-peek-approved.png`
- 이번 사용자 근거: 대화 첨부의 주장·근거 화면과 승인 완료 화면.

## 데이터·행동 계약

- 승인 API 공개 영수증은 `decision`, `outcome`, `artifacts.resource`, `artifacts.summary`만 반환한다.
- RESOURCE·SUMMARY 생성 여부는 CLI 성공 응답에 실제 경로가 있을 때만 `true`다.
- 브라우저는 승인 후 문서 목록을 새로 읽고 `knowledge-<job-id>`인 인사이트 문서를 찾아 연다.
- 최근 승인된 인사이트는 재진입 뒤에도 실제 문서 목록에서 찾아 `Focus Feed → 사람 승인 → 인사이트` 배선과 함께 보여 준다.
- 모든 승인·보류·거절 실행은 사람만 클릭한다.

## 검수 뷰포트와 상태

- 1280×720: 목록, 주장 행, 최근 승인 배선, 실제 인사이트 열기, light/dark
- 390×844: 목록·최근 승인 배선, 상세·주장 행, 버튼 44px 이상, 가로 넘침 없음
- 키보드: 지식 검토 열기/닫기 포커스 복귀, 성공 상태 제목 포커스, CTA 접근 가능한 이름

## 구현 증거

- `captures/01-list-recent-flow-1280x720.png`
- `captures/02-claims-hierarchy-1280x720.png`
- `captures/03-list-recent-flow-mobile-390x844.png`
- `captures/04-claims-hierarchy-mobile-390x844.png`
- `captures/05-list-recent-flow-dark-1280x720.png`
- `captures/06-approved-insight-open-1280x720.png`
