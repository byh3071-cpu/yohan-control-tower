# Blockers

_Append-only. 해결 항목은 ~~취소선~~으로 표기._

- ~~2026-08-07 — Goal 2: 현재 실행 환경에서 로컬 Next.js 미리보기가 클라우드 브라우저에 연결되지 않아 데스크톱·모바일 시각 QA 미완료.~~ 해결: 임시 로컬 Chromium + Playwright로 1440×900·390×844 실제 렌더링 검증 완료.
- ~~2026-08-07 — Goal 2: brain 체크아웃 부재로 v1.1 선행 게이트(`ecosystem-contract.yaml` 개정, `projects.yaml` 정본화) 검증 불가. Draft PR 병합 금지.~~ 해결: GitHub Connector로 active contract v0.3.0·projects v0.1.1·ADR-013 Accepted 확인.
- ~~2026-08-07 — Goal 2: 연결된 GitHub App이 브랜치 생성에 403을 반환하고 로컬 Git 인증도 없어 원격 브랜치·Draft PR 게시 불가.~~ 해결: ChatGPT Codex Connector를 `yohan-control-tower`에 설치한 뒤 원격 브랜치와 Draft PR #30 생성.
- ~~2026-08-23 — Goal 13: 승인·멱등성 증명과 Goal 고유 게이트는 통과했지만 프로젝트 전체 `vhk check`가 기존 기준선 21건으로 실패한다. 필수 환경변수·메서드명·Qdrant 연산자·테스트 접미사 오탐과 PascalCase 벡터 컴포넌트 5개의 실제 파일명 위반이 섞여 있어 별도 범위 정리가 필요하다.~~ 해결: Goal 15에서 VHK 일반 검사와 프로젝트 전용 AST 검사를 합성하고 실제 파일명 위반을 정리해 `vhk check`·`vhk verify`·Goal 15 전용 게이트를 모두 통과했다.
