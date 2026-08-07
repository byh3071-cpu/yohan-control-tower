# Learnings

_Append-only. 한 줄 = 한 교훈._

- 2026-08-07 — VHK 2.12.0 `goal next`가 “모든 goal 완료”를 출력해도 기존 `next-task.md`의 과거 Goal 번호를 갱신하지 않을 수 있으므로 파일 상태를 교차 확인한다.
- 2026-08-07 — Next dev Fast Refresh 중 연속 viewport QA는 동적 상세 route의 일시 404를 만들 수 있으므로 최종 상호작용·시각 증거는 production build 서버에서 재검증한다.
- 2026-08-07 — Chromium의 same-origin fetch POST는 `Origin`을 생략할 수 있으므로 loopback 쓰기 경계는 `Origin`만 강제하지 말고 `Sec-Fetch-Site: same-origin`과 같은-origin `Referer` 조합도 검증한다.
