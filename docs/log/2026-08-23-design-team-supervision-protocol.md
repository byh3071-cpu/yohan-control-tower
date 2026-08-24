---
date: 2026-08-23
work: 디자인팀 감독·검토·장애조사의 재시작 안전 운영 계약
goal: 16
status: done
---

# 디자인팀 감독·검토·장애조사 운영 계약

## 결과

- 디자인팀, 독립 QA 검토자, 장애 조사자, 상시 지휘자의 책임과 인수 조건을 한 운영 매뉴얼로 정리했다.
- 프로젝트 소유 보고서와 Orca `worker_done`을 각각 내용·전달 영수증으로 정의했다.
- runtime 재시작·전달 유실 때 기존 Run, terminal, worktree, 보고서, Inbox를 먼저 대조하고 중복 worker를 만들지 않는 복구 순서를 정의했다.
- 사용자가 원하는 반복 능력을 `supervised-session-conductor`, `restart-safe-handoff`, `runtime-incident-investigator` 세 신규 스킬로 분리했다.

## 현재 인수 판정

- 디자인 자산 상세 프로토타입은 반응형·키보드·콘솔 등 기술 QA가 통과했다.
- 실제 사용자 5개 과제, 독립 Claude Code 문서 검토 보고, 장애 조사자 보고는 아직 인수되지 않았다.
- 디자인 branch의 Goal 15와 main의 Goal 15가 의미적으로 충돌하며, 디자인 branch의 Goal 13 상태도 오래됐다. production handoff 전에 재번호·상태 정합이 필요하다.
- Orca runtime은 `starting/reachable false`였고, 잠시 `ready`를 반환한 직후 Run·Task·Inbox·Terminal 조회가 모두 `runtime_unavailable`로 실패했다. 추가 재시작은 수행하지 않았다.

## 원인 판정

- app process와 terminal daemon은 살아 있고 일부 session은 재연결됐다.
- 디자인 terminal은 exit code 1로 종료됐고 graph/worktree refresh에서 `spawn git ENOENT`가 반복됐다.
- 같은 환경에서 Git 성공 호출도 있어 Git 미설치로 판정할 수 없다.
- Orca graph/worktree 실행 환경 문제와 runtime 기동 불안정의 연관 가능성은 있으나 직접 인과와 최초 재시작 원인은 확정되지 않았다.
- Claude Code 작업이 재시작의 직접 원인이라는 증거는 없다.

## 검증

- `npm.cmd run vhk -- goal check --id 16 --force`
  - typecheck: PASS
  - lint: PASS
  - test: PASS
  - build: PASS
  - Goal 16 문서 계약: PASS
- 첫 build는 Google Fonts 네트워크 차단으로 실패했고, 네트워크 허용 동일 명령에서 통과했다.
- `git diff --check`: PASS.

## 다음 게이트

1. 디자인팀이 공통 보고 계약으로 디자인 최종 보고를 남긴다.
2. 독립 QA 검토자와 장애 조사자가 각각 별도 보고서를 남긴다.
3. runtime이 안정적으로 연결되면 기존 Run·Task·Dispatch·Inbox를 감사하고 내용 영수증과 전달 영수증을 재결합한다.
4. 지휘자가 세 보고를 하나의 사용자 결정 보고로 통합한다.
5. 사용자가 디자인 승인·수정·거절과 필요한 Orca 복구 조치를 결정한다.
