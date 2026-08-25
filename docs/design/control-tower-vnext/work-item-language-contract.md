# 관제탑 작업 항목 언어 계약

- Status: approved · 사용자 승인 2026-08-24
- Revision: WORK-ITEM-LANGUAGE-R1
- Prepared: 2026-08-24 (Asia/Seoul)
- Scope: 관제탑 사용자 화면, Goal 상세, 세션 인수인계

## 결론

관제탑의 실행 계층은 `단계(Phase) → 목표(Goal) → 작업(Task)`이다. `이슈(Issue, 흔히 Ticket)`는 이 계층의 네 번째 단계가 아니라 별도 추적이 필요한 Goal 또는 Task에 연결되는 기록이다.

```text
단계 Phase
└─ 목표 Goal
   └─ 작업 Task  ← Goal 문서의 Completion Check

이슈 Issue ───── Goal 또는 Task에 필요할 때만 연결
```

## 표준 정의

| 화면 기본 명칭 | 영문·식별자 | 정의 | 생성·표시 조건 |
| --- | --- | --- | --- |
| 단계 | `PHASE` | 여러 Goal이 함께 만드는 사용자 결과 또는 전달 단계 | 프로젝트 문서에 이름이 선언된 경우만 표시한다. 이름을 AI가 추론하지 않는다. |
| 목표 | `GOAL <id>` | 단독으로 검증하고 완료할 한 가지 결과 | VHK `goals/*.md`가 정본이다. ID·이름·상태·진행률을 표시한다. |
| 작업 | `TASK <현재>/<전체>` | Goal의 Completion Check 하나. 지금 실행하고 참·거짓으로 확인할 원자 행동 | Goal의 현재 미완료 Completion Check를 표시한다. 별도 추적이 필요하지 않으면 독립 ID를 만들지 않는다. |
| 이슈 | `ISSUE #<id>` | 논의·담당자·의존성·이력 보존이 필요한 추적 항목. 흔히 ticket이라고 부른다. | 장기 추적, 외부 협업, 크로스레포 의존, 재현 가능한 버그일 때 GitHub Issue로 만들고 Goal 또는 Task에 연결한다. 링크가 없으면 섹션 전체를 숨긴다. |

## 이름 문법

- 단계: 명사형 결과 또는 전달 구간 — `관제탑 vNext 디자인 확정`
- 목표: 완료 상태를 판정할 수 있는 결과 — `관제탑 디자인 방향과 구현 명세 확정`
- 작업: 동사+목적어 한 줄 — `업무 단위와 용어를 검토해 확정한다`
- 이슈: 문제나 조정 대상을 직접 표현 — `VHK 완료 스냅샷이 이전 Goal을 가리킨다`

`정리한다`, `개선한다`, `고도화한다`만으로 끝나는 이름은 완료 상태를 판정하기 어려우므로 쓰지 않는다. `이번 일`, `현재 항목`, `진행 방향`처럼 대상을 다시 해석해야 하는 표현도 피한다.

## 상태와 관계

- 공통 사용자 상태는 `예정 / 진행 중 / 검토 대기 / 막힘 / 완료` 다섯 개를 기본으로 한다.
- 이슈 유형(`bug`, `feature`, `task`)은 분류값이지 Phase·Goal·Task 위계가 아니다.
- 일정 구간(`Cycle`, `Sprint`, `Milestone`)은 시간 또는 릴리스 메타데이터이지 실행 계층이 아니다.
- `Epic`, `Story`, `Subtask`는 Jira 방식이 필요해질 때만 도입한다. 현재 VHK 계약 위에 이름만 얹지 않는다.

## 화면 규칙

1. 한국어 명칭을 본문으로 쓰고 영문은 작은 고정 레이블과 ID에만 쓴다.
2. 현재 Task 이름을 화면의 첫 문장으로 사용한다.
3. Phase와 Goal은 Task의 위치를 알려주는 한 줄 경로로 축약한다.
4. 현재 상태와 핵심 행동은 각각 하나만 표시한다.
5. 이슈·담당자·기한·승인·막힘은 실제 값이 있을 때만 나타난다.
6. 용어 사전은 기본 화면에 상시 노출하지 않는다. 도움말이나 문서에서만 제공한다.

## 근거

| Source | 관찰 | 관제탑 적용 |
| --- | --- | --- |
| `RULES.md` VHK 운영 규칙 | Phase는 사용자 결과 묶음, Goal은 독립 검증 결과, Completion Check는 원자 Task | 세 단계의 정본 의미로 사용 |
| `RULES.md` ticket 규칙 | VHK 2.12.0에 ticket 명령이 없고 장기·외부·크로스레포에만 GitHub Issue 사용 | Issue는 조건부 링크로만 표시 |
| [GitHub Issues](https://docs.github.com/en/issues/tracking-your-work-with-issues/learning-about-issues/about-issues) | Issue는 아이디어·피드백·Task·Bug를 추적하며 sub-issue와 dependency를 지원 | Ticket 대신 정식 UI 명칭을 `이슈`로 사용 |
| [Jira work types](https://support.atlassian.com/jira-cloud-administration/docs/what-are-issue-types/) | 기본 계층은 Epic / Story·Task·Bug / Subtask이며 work type은 조직에 맞게 바뀜 | Jira 명칭을 보편 표준으로 복제하지 않음 |
| [Linear concepts](https://linear.app/docs/conceptual-model) | Initiative / Project / Issue가 전략·전달·일상 작업을 서로 다른 객체로 관리 | 추적 객체와 결과 계층을 분리하는 참고 |

## 금지 패턴

- `Phase → Goal → Ticket → Task`처럼 Issue를 억지로 실행 계층에 넣기
- 존재하지 않는 Phase 이름, Issue 번호, 담당자, 기한을 fixture 편의로 만들기
- `Ticket`과 `Task`를 같은 뜻으로 번갈아 쓰기
- Goal 이름과 Task 이름을 같은 문장으로 반복하기
- 빈 메타데이터를 `없음` 행으로 계속 노출하기
