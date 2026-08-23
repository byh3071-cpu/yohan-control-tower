# 스킬·도구 상세 정보 계약

- Status: proposed · visual validation pending
- Canonical source: `yohan-cc-skills/distribution/asset-catalog.json`
- Verified at: 2026-08-22 (Asia/Seoul)
- Scope: 목록·검사 열의 정보 구조와 API 읽기 모델. production 구현 승인 아님.

## 결론

`design-team`의 역할 구성을 모든 자산에 공통 적용하지 않는다. 목록은 모든 자산이 공유하는 최소 정보만 보여주고, 우측 검사 열은 `kind`에 따라 다른 상세 렌더러를 사용한다. 값이 없는 섹션은 빈 카드로 남기지 않고 숨긴다.

현재 정본은 **201개, 12종**이다. 수량은 화면에 하드코딩하지 않고 카탈로그 응답에서 계산한다.

| 종류 | 수량 |
| --- | ---: |
| 스킬 | 100 |
| 에이전트 | 13 |
| MCP | 1 |
| 훅 | 7 |
| 플러그인 | 4 |
| 명령 | 4 |
| 규칙 | 14 |
| 설정 | 5 |
| 매니페스트 | 18 |
| 스크립트 | 31 |
| 테스트 자료 | 3 |
| 템플릿 | 1 |

## 익숙한 용어를 쓰는 탐색

상위 화면 이름은 `스킬·도구`로 쓴다. `자동화 자산`, `실행 능력`, `연결·활성화`, `정책·패키징`, `검증·도구` 같은 새 분류어는 기본 UI에서 사용하지 않는다.

기본 필터는 실제 종류명을 그대로 쓴다.

> 전체 201 · 스킬 100 · 에이전트 13 · MCP 1 · 플러그인 4 · 훅 7 · 더보기

`더보기`에는 `명령 / 규칙 / 설정 / 매니페스트 / 스크립트 / 테스트 자료 / 템플릿`을 수량과 함께 표시한다. `기타 56`처럼 서로 다른 종류를 하나의 값으로 합치지 않는다.

목록의 기본 열은 다음 다섯 개만 둔다. `정본·릴리스` 셀 안에서도 두 상태는 각각 이름을 붙인 별도 줄로 표시하며 하나의 배지로 합치지 않는다.

> 이름 · 종류 · 정본 단계 + 릴리스 포함 · 지원 환경 · 현재 PC

검증 결과와 출처는 선택한 항목의 검사 열에서 자세히 본다. `확인 필요`가 있을 때만 목록에 짧은 상태 표식을 추가한다.

## 서로 섞지 않는 다섯 개념

| 개념 | 예시 | 표시 위치 |
| --- | --- | --- |
| 맡은 역할 | 디자인 지휘, 조사, 기술 검토 | 실제 실행 기록 |
| 실행 환경 | Codex, Claude Code, Cursor, Antigravity | 지원 환경 또는 실행 기록 |
| 사용 모델 | GPT-5.6 Sol, Opus, Composer | 실제 실행 기록 |
| 관리 주체 | yohan-agent-kit, yohan-core | 자산 공통 상세 |
| 사용한 스킬·도구 | design-team, ImageGen | 실제 실행 기록 |

`Codex`는 역할자가 아니다. 정적 자산 상세에는 특정 클라이언트나 모델을 현재 담당자처럼 표시하지 않는다. 실행 영수증이 있을 때만 다음처럼 분리해 표시한다.

> 디자인 지휘<br>
> Codex · GPT-5.6 Sol · xhigh<br>
> design-team 사용

## 상태 축

하나의 초록색 `사용 중`으로 합치지 않는다.

1. **지원 대상으로 선언됨** — 카탈로그의 `vendors`
2. **현재 릴리스에 포함됨** — lifecycle과 release bundle을 함께 확인
3. **현재 PC에 설치됨** — 로컬 설치 근거가 있을 때만 표시
4. **실제 세션에서 검증됨** — production 검증 영수증이 있을 때만 표시

fixture의 `PASS`는 `TEST_ONLY`이며 실제 검증 근거로 승격하지 않는다. 확인할 근거가 없으면 `확인 안 됨`으로 표시한다.

카탈로그의 `agent-plugins`는 배포 대상이며 사용자가 실행하는 클라이언트가 아니다. `지원 환경 4개`에는 Claude Code·Codex·Cursor·Antigravity만 센다.

## 공통 머리말

모든 종류의 검사 열은 접히지 않는 공통 머리말에서 한 번만 다음 정보를 보여준다.

- 이름, 종류, 한 줄 설명
- 정본 단계, 릴리스 포함, 현재 PC, 최신 검증 결과의 분리된 상태
- 관리 주체와 출처
- 지원 환경 요약
- 최신 검증 시각이 있으면 결과와 함께 표시하고, 없으면 `검증 기록 없음`으로 표시

그 아래는 지원 환경과 종류별 섹션만 렌더링한다. 공통 머리말에 승격한 관리 주체·출처·검증을 접힌 `근거` 안에 중복하지 않으며, 접힌 영역에는 digest·조사 시각·추가 영수증처럼 실제로 더 읽을 근거가 있을 때만 남긴다.

## 종류별 상세 렌더러

| 종류 | 보여줄 정보 | 강제로 넣지 않을 정보 |
| --- | --- | --- |
| 스킬 | 설명, 호출 조건, 자동 호출 여부, 참조 문서, 파일 목록 | 역할 조직도, 설치 버튼 |
| 에이전트 | 책임, 기본 모델 힌트, 허용 도구, 부모 플러그인 | 현재 실행 모델, 팀 구성 |
| MCP | 서버명, 연결 방식, 제공 기능 수, 연결 상태, 필요한 환경변수 이름 | 역할 카드, 원본 command·args·env |
| 훅 | 이벤트, handler 수, 대상 환경, timeout·실패 정책 | 설치 버튼, 팀 구성 |
| 플러그인 | 이름·버전, 포함된 스킬·에이전트·명령·훅·MCP, 활성 상태 | 하위 자산의 중복 설치 수 |
| 명령 | 명령명, 설명, 인자 형식, 부작용 수준, 부모 플러그인 | 임의 cwd·원본 실행 문자열 |
| 규칙 | 적용 범위, 정본, 전파 대상, 생성본 여부, 우선순위 | 설치 상태 |
| 설정 | 대상 환경, 설정 종류, schema version, 안전한 key 요약 | 비밀 값, 전체 설정 원문 |
| 매니페스트 | 대상 자산, 파일 수, 바이트, digest, drift 상태 | 역할·클라이언트 실행 정보 |
| 스크립트 | 언어, 용도, 호출 주체, 읽기·쓰기 경계, 패키지 포함 여부 | 검증되지 않은 실행 가능 배지 |
| 테스트 자료 | synthetic 여부, schema, 시나리오 수 | 실제 검증 통과 배지 |
| 템플릿 | 매체·형식, 입력, 생성 결과, 버전·digest | 설치 상태 |

registry에는 아직 종류별 상세 필드가 없다. 위 정보는 Control Tower가 허용된 원본을 안전하게 파싱해 만드는 **읽기 모델**이며, 기존 카탈로그 필드인 것처럼 표시하지 않는다.

## `design-team` 표시 규칙

`design-team`의 여섯 역할은 고정 조직도가 아니다. 프로젝트 맥락과 불확실성에 따라 필요한 역할만 선택되고, 작은 작업은 한 실행자가 여러 역할을 맡을 수 있다.

- 정적 스킬 상세: 역할 카드 없음
- 실행 기록 있음: `이번 작업의 역할`만 표시
- plugin이 agent를 포함함: `포함된 에이전트`로 표시
- `이번 작업의 역할`과 `포함된 에이전트`를 같은 의미로 쓰지 않음
- 실행 기록 없음: 역할 영역 자체를 숨김

## TypeScript 읽기 모델

```ts
type KnownAssetKind =
  | "skill"
  | "agent"
  | "mcp"
  | "hook"
  | "plugin"
  | "command"
  | "rule"
  | "config"
  | "manifest"
  | "script"
  | "fixture"
  | "template"

interface AssetCommon {
  id: string
  name: string
  summary?: string
  owner: string
  lifecycle: "candidate" | "reviewed" | "approved" | "released" | "deprecated"
  releaseInclusion: "included" | "excluded" | "unknown"
  portability: string
  supportedClients: ClientId[]
  sourceRef: string
  contentDigest?: string
  requiredEnvironmentNames: string[]
  latestVerification?: {
    state: "passed" | "failed" | "not-run" | "stale"
    verifiedAt?: string
    sourceRef?: string
  }
}

interface ClientState {
  client: ClientId
  declared: boolean
  packageState:
    | "included"
    | "excluded-by-lifecycle"
    | "unsupported-component"
    | "unknown"
  installState?: "installed" | "missing" | "conflict" | "unknown"
  verificationState?: "passed" | "failed" | "not-run" | "stale"
  verifiedAt?: string
}

type AssetDetail =
  | { kind: "skill"; common: AssetCommon; detail: SkillDetail }
  | { kind: "agent"; common: AssetCommon; detail: AgentDetail }
  | { kind: "mcp"; common: AssetCommon; detail: McpDetail }
  | { kind: "hook"; common: AssetCommon; detail: HookDetail }
  | { kind: "plugin"; common: AssetCommon; detail: PluginDetail }
  | { kind: "command"; common: AssetCommon; detail: CommandDetail }
  | { kind: "rule"; common: AssetCommon; detail: RuleDetail }
  | { kind: "config"; common: AssetCommon; detail: ConfigDetail }
  | { kind: "manifest"; common: AssetCommon; detail: ManifestDetail }
  | { kind: "script"; common: AssetCommon; detail: ScriptDetail }
  | { kind: "fixture"; common: AssetCommon; detail: FixtureDetail }
  | { kind: "template"; common: AssetCommon; detail: TemplateDetail }
  | {
      kind: "unknown"
      rawKind: string
      common: AssetCommon
      detail: Record<string, never>
    }
```

현재 registry validator는 `kind`를 닫힌 enum으로 검증하지 않으므로 `unknown` fallback을 유지한다.

## 브라우저에 보내지 않는 정보

- API key, token, OAuth, credential, authorization 값
- 환경변수 값—이름만 허용
- MCP 원본 command·args·env
- 사용자명과 절대 홈 경로
- 전체 프롬프트와 숨은 지시문
- 원본 stdout·stderr와 비공개 데이터
- 불필요한 개인 식별정보

## 시각 검증 조건

- `design-team`, MCP, 훅, 플러그인을 차례로 선택했을 때 같은 빈 카드 틀이 반복되지 않는다.
- `Codex`가 역할 또는 작성자로 오인되지 않는다.
- 지원 환경과 현재 PC 상태를 한눈에 구분한다.
- 정본 단계와 릴리스 포함 여부가 별도 이름으로 목록과 검사 열에 모두 나타난다.
- 201개와 종류별 수량은 카탈로그가 바뀌면 자동으로 갱신된다.
- 없는 섹션은 숨기며, 숨김 때문에 핵심 상태가 사라지지 않는다.

## 2026-08-22 종류별 시각 상태 검토

- MCP: 스킬의 호출·참조 구조 대신 `연결 정보 / 필요한 환경 설정 이름 / 연결 상태 확인`이 나타나 종류 차이가 성립했다.
- 훅: `처리 대상 / 이벤트 연결 / 실패 정책 / 제한 시간` 구조가 성립했다. 다만 ImageGen이 `훅`을 `흑`으로 반복 오렌더링해 텍스트 정확성은 실패했다.
- 플러그인: `지원 환경 / 버전 / 호환 범위 / 포함 항목` 구조가 성립했고 하위 자산을 설치 수로 중복 집계하지 않았다. 포함 항목의 `훅` 글자는 같은 오렌더링 문제가 남았다.
- 세 화면은 1486–1487×1058 preview로 생성돼 구조 비교에는 충분하지만 1440×1024 실측 증거가 아니다.
- 결론: 종류별 정보 구조는 조건부 통과, 한글 텍스트·정확한 폭·상호작용은 native HTML 또는 Figma 프로토타입에서 다시 검증한다. 생성 이미지를 production QA 증거로 사용하지 않는다.
