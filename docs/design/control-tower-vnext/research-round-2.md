# 요한 관제탑 vNext 2차 구조·레퍼런스 조사

- Date: 2026-08-22
- Scope: 할 일·일정 진입, 자동화 자산 전체 범위, 문서·디자인 관계, 진한 블랙앤화이트 시각 체계
- State: evidence-backed proposal

## 결론

할 일과 일정은 각각 독립 화면이 필요하지만 상위 탭을 두 개 더 만드는 것은 5탭 상한과 충돌한다. `작업`이라는 한 상위 영역 아래 `할 일 / 일정 / 프로젝트`를 좌측 중첩 항목과 화면 내부 형제 보기로 제공하는 편이 직접 진입성과 단순성을 함께 지킨다. 기존 `스킬·도구`는 canonical 197개를 수용하는 `자동화 자산`으로 확장하고 catalog·설치·runtime·검증을 분리해야 한다. [확신 높음]

## 확인된 로컬 사실

- Agent Kit canonical catalog: 197개.
- kind: skill 99, script 29, manifest 17, rule 14, agent 13, hook 7, config 5, plugin 4, command 4, fixture 3, mcp 1, template 1.
- lifecycle: approved 91, released 85, candidate 12, reviewed 4, deprecated 5.
- catalog는 설치·활성·검증 완료의 증거가 아니다.
- Brain의 과거 ecosystem 문서에는 `26 skills / 95 assets`가 남아 있어 현재 catalog와 불일치한다.
- Design Intelligence는 4개 item을 색인하지만 validator 오류가 있어 `색인됨`과 `유효·승인됨`을 분리해야 한다.

## 공식 레퍼런스에서 가져올 패턴

| 질문 | 1차 출처 | 가져올 것 | 가져오지 않을 것 |
| --- | --- | --- | --- |
| 내 할 일을 어디서 시작하는가 | [Linear My Issues](https://linear.app/docs/my-issues), [Linear Inbox](https://linear.app/docs/inbox) | 중요한 일의 curated order, 주의가 필요한 항목의 별도 큐 | 다중 팀·구독 알림 구조 전체 |
| 할 일과 일정은 어떻게 연결하는가 | [Notion Task databases](https://www.notion.com/help/sprints), [Notion Calendar](https://www.notion.com/help/use-notion-calendar-with-notion) | Home에는 요약, 전체 화면은 별도; 일정과 문서·프로젝트 링크 | Notion을 관제탑 정본으로 사용하거나 양방향 sync |
| 같은 작업을 다른 방식으로 보는가 | [GitHub Projects views](https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project) | 한 scope 안의 표·보드·일정 보기, 저장된 필터 | 보기마다 새 상위 탭 생성 |
| 많은 자동화 자산을 어떻게 다루는가 | [VS Code Extensions](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace) | catalog/installed, enabled/disabled, update, verification 분리 | catalog 항목을 모두 설치됨으로 가정 |
| 자산 관계는 어떻게 모델링하는가 | [Backstage Catalog](https://backstage.io/docs/features/software-catalog/), [Catalog Graph](https://backstage.io/docs/features/software-catalog/creating-the-catalog-graph/) | 원본 Git metadata, kind, owner, typed relation, 선택 항목 중심 탐색 | catalog를 새 SoT 또는 실시간 runtime으로 오인 |
| MCP를 무엇으로 보여주는가 | [MCP Architecture](https://modelcontextprotocol.io/specification/2025-06-18/architecture), [Server primitives](https://modelcontextprotocol.io/specification/2025-06-18/server/index) | server와 resources/tools/prompts capability 분리, consent 경계 | MCP 하나를 단순 plugin 아이콘으로 축약 |
| 진한 흑백 UI를 어떻게 안정화하는가 | [Vercel Geist Colors](https://vercel.com/geist/colors), [Geist Tabs](https://vercel.com/geist/tabs) | background 단계를 적게 쓰고 text/icon·border 의미를 분리; sibling view만 tab 사용 | badge·card·elevation 남용 |
| 아이콘을 어떻게 보장하는가 | [Lucide](https://lucide.dev/) | named vector icon, 동일 stroke·크기, 접근 가능한 이름 | ImageGen glyph를 production asset으로 사용 |

## 제안 IA

상위 영역은 다섯 개로 유지한다.

1. `지금` — 이어갈 한 일, 승인, 막힘, 오늘 시간 항목
2. `작업` — 좌측 중첩 항목 `할 일 / 일정 / 프로젝트`
3. `지식·디자인` — 문서, Design Intelligence, 결정, 산출물
4. `자동화 자산` — 12 kind catalog와 가용·검증 상태
5. `운영 기록` — 실행 event, audit, publish, source health

Vector·진단·고위험 명령은 하단 `시스템 상태`에서 들어간다. `작업`의 세 자식은 독립 URL과 선택 상태를 가지되 상위 `ViewTab`은 하나다.

## 자동화 자산 facet

| Facet | kind | 합계 |
| --- | --- | ---: |
| 실행 능력 | skill · agent · command | 116 |
| 연결·활성화 | plugin · mcp · hook | 12 |
| 정책·패키징 | rule · config · manifest | 36 |
| 검증·도구 | script · fixture · template | 33 |

공통 목록에는 `이름 / kind / 소유 원본 / catalog 단계 / 가용 / 검증 / 사용처`만 둔다. 종류별 설치·연결·파싱·실행 상태는 상세로 내린다.

## 반대 관점과 잔여 위험

- 할 일과 일정을 각각 최상위로 올리면 발견성은 더 높다. 하지만 기록·자동화 중 하나를 숨겨야 하고 실제 사용 빈도 근거가 없다. [확신 중간]
- 프로젝트를 `작업` 아래로 넣으면 계층이 한 단계 깊어진다. 좌측에서 세 자식을 항상 직접 보이게 하고 단축키를 제공해 클릭 수를 늘리지 않아야 한다.
- 197개 자산을 네 facet으로 묶는 것은 사용자 업무 기반 제안이지 catalog의 공식 분류가 아니다. raw kind 필터를 항상 제공한다.
- ImageGen은 작은 아이콘·한글을 왜곡할 수 있다. 시안은 구조와 느낌 증거이며 아이콘·타이포 품질 검증은 실제 컴포넌트 렌더에서만 가능하다.

## Keep / merge / hide / defer / remove

- **Keep** — 3안의 행 밀도, 흰 작업면, 파란 선택선, 본문과 붙은 검사 열.
- **Merge** — 할 일·일정·프로젝트를 `작업` 범위로, 12 asset kind를 네 facet으로.
- **Hide** — 관계가 없는 일정 섹션, raw prompt, secret, 위험 명령.
- **Defer** — install/update/restore, global graph, 자동 freshness 계산.
- **Remove** — 생성된 깨진 glyph, 한 줄 화살표 관계 문장, 근거 없는 mock 일정의 실제 상태 표현.
