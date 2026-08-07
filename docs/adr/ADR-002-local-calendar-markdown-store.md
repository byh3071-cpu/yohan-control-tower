# ADR-002 — Calendar 원장은 항목별 로컬 Markdown 파일로 둔다

- 상태: Accepted
- 날짜: 2026-08-07
- 범위: Goal 4 / Calendar MVP

## 결정

Calendar의 첫 원장은 `YOHAN_CALENDAR_ROOT/items/*.md`로 둔다. 일정과 할 일은 파일 하나당 항목 하나이며, 구조화 필드는 YAML frontmatter, 메모는 Markdown 본문에 저장한다. 관제탑은 이 원장을 읽고 쓰되 Brain·Notion은 수정하지 않는다.

핵심 필드는 `calendar_format`, `id`, `kind`, `title`, `date`, `start_time`, `end_time`, `status`, `recurrence`, `recurrence_interval`, `recurrence_until`, `completed_dates`, `created_at`, `updated_at`이다.

## 이유

- 로컬 우선이며 Claude Code·Codex가 별도 DB 도구 없이 읽고 수정할 수 있다.
- 일정 1건의 변경 범위가 파일 1개라 충돌·복구·Git 이력이 명확하다.
- Calendar UI와 AI가 같은 구조를 보므로 숨은 DB 스키마가 생기지 않는다.
- 현재 관제탑의 `DB 없음` 구조를 유지하면서도 나중에 SQLite 인덱스나 ICS export를 파생 복사본으로 붙일 수 있다.

## 경계

- `YOHAN_CALENDAR_ROOT`는 PC별 절대경로로 명시하며 cwd·Brain 위치에서 추론하지 않는다.
- Calendar의 `task`는 날짜에 배치된 개인 실행 항목이고, 프로젝트 `goals/*.md`의 Task(Goal)는 프로젝트 진행 정본이다. 이번 MVP는 둘을 자동 복제·동기화하지 않는다.
- 반복 발생분은 읽을 때 파생한다. 반복 할 일의 완료일만 `completed_dates`에 기록해 원본 전체 완료를 막는다.
- 삭제는 이번 MVP에서 제공하지 않는다. 잘못 만든 항목은 AI/파일 편집 또는 후속 archive 기능으로 다룬다.
- PWA 알림과 Google·Apple·Outlook Calendar 동기화는 이 원장의 소비자이며 정본이 아니다.

## 기각한 대안

- **Notion을 정본으로 유지**: 기존 복잡성과 외부 의존을 다시 만든다.
- **앱 저장소 안 JSON 1개**: 개인 일정이 소스 커밋에 섞이고 동시 수정 충돌 범위가 커진다.
- **초기부터 SQLite**: UI에는 좋지만 AI 직접 가독성과 현재 MVP의 복잡도 기준에 불리하다.
