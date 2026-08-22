---
date: 2026-08-22
work: Goal 13 지식 검토 1회 승인 증명
branch: byh3071-cpu/tower-workbench-20260822
pull_request: null
---

# Goal 13 승인 전후 Brain 증명

## 사용자 승인

- 대상 job: `2ce64944-0a81-4274-82bf-f7542e43d9ad`
- 제목: 클로드 코드 800시간 쓰고 깨달은 9가지 꿀팁
- 사람 승인 시각: `2026-08-22T12:44:42.208972+00:00`
- 실행 주체: 사용자가 격리된 Orca 브라우저 UI에서 직접 승인 버튼을 클릭했다.
- 에이전트는 승인·보류·거절 버튼을 클릭하지 않았다.

## 생성 증거

| 산출물 | Brain 상대경로 | 수 | SHA-256 |
| --- | --- | --- | --- |
| RESOURCE | `memory/ingest/url/knowledge-2ce64944-0a81-4274-82bf-f7542e43d9ad.md` | 1 | `94a22a0ac72f12fa8fa18ce7a5609ce43f1c8a5611b8885d3c517dff085cb62e` |
| SUMMARY | `memory/ingest/insights/knowledge-2ce64944-0a81-4274-82bf-f7542e43d9ad.md` | 1 | `50cd6e7648066fa8824cdc9d9036381cf50181ced15b200cf3032ff27808df77` |

- 두 파일의 생성·최종 수정 시각은 `2026-08-22 12:44:42 UTC`다.
- 승인 뒤 `knowledge.py reviews` 대기열에서 대상 job이 제거됐다.
- Brain 기존 파일을 수정하지 않고 신규 RESOURCE·SUMMARY만 생성했다.

## 재승인 멱등성

동일 job을 CLI로 다시 승인했을 때 `ok: true`, `idempotent: true`, 종료 코드 0을 반환했다. 재승인 전후 RESOURCE·SUMMARY SHA-256은 모두 동일했다.

## UI 연결 증거

- 공개 승인 영수증은 결정·결과·RESOURCE/SUMMARY 생성 여부만 반환하며 파일 경로와 해시는 제외한다.
- 문서 목록을 새로 읽어 `knowledge-2ce64944-0a81-4274-82bf-f7542e43d9ad` 인사이트를 찾았고, 최근 승인 배선의 `인사이트 열기`로 실제 SUMMARY 문서를 열었다.
- 시각 증거: `docs/design/knowledge-review/captures/01-list-recent-flow-1280x720.png`, `docs/design/knowledge-review/captures/06-approved-insight-open-1280x720.png`.
