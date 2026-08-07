# Learnings

_Append-only. 한 줄 = 한 교훈._

- 2026-08-07 — VHK 2.12.0 `goal next`가 “모든 goal 완료”를 출력해도 기존 `next-task.md`의 과거 Goal 번호를 갱신하지 않을 수 있으므로 파일 상태를 교차 확인한다.
- 2026-08-07 — Next dev Fast Refresh 중 연속 viewport QA는 동적 상세 route의 일시 404를 만들 수 있으므로 최종 상호작용·시각 증거는 production build 서버에서 재검증한다.
- 2026-08-07 — Chromium의 same-origin fetch POST는 `Origin`을 생략할 수 있으므로 loopback 쓰기 경계는 `Origin`만 강제하지 말고 `Sec-Fetch-Site: same-origin`과 같은-origin `Referer` 조합도 검증한다.
- 2026-08-07 — VHK 2.12.0 생성 `AGENTS.md`의 next-task append-only 지시와 `goal next` 덮어쓰기가 모순되므로 next-task는 VHK 관리 스냅샷, blockers만 append-only로 구분한다(VHK #555).
- 2026-08-07 — configured CORE-RULES 원본이 없는 새 환경의 `vhk sync`는 번들 v0.1.0으로 무음 다운그레이드할 수 있어 프로젝트 래퍼가 Brain 원본을 연결하고 부재 시 sync를 차단해야 한다(VHK #556).
- 2026-08-07 — 로컬 Markdown Calendar의 안전 삭제는 `expectedUpdatedAt` 충돌 검사 후 원문 바이트를 `items/`→`trash/`로 rename하고, 활성 ID 충돌 없이 역 rename하는 방식으로 영구 삭제를 피한다.
- 2026-08-07 — VHK memory 원본이 ignore되어도 `vhk learn`이 만든 `.bak`에는 같은 개인 내용이 남으므로 `.vhk/*.bak`도 Git에서 제외해야 한다(VHK #557).
- 2026-08-07 — 모든 Goal이 DONE이어도 VHK 2.12.0 `goal next`는 마지막 IN_PROGRESS snapshot을 남기므로 새 세션 전에 goal list와 next-task를 교차 확인하고 VHK 관리본만 전체 완료로 보정한다(VHK #558).
