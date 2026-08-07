import { existsSync } from "node:fs"
import { isAbsolute, join, resolve } from "node:path"

import { config as loadDotenv } from "dotenv"

/**
 * brain(요한 브레인) 레포 루트 — 모든 SoT 의 출발점.
 *
 * `YOHAN_OS_ROOT` env 로만 해석한다. **cwd 추론 폴백은 전부 제거했다**(ARCHITECTURE §6-②).
 * 제거 이유: 이 레포에 `memory/` 디렉토리가 생기는 순간 옛 폴백이 자기 자신을 brain 으로
 * 조용히 해석해, 엉뚱한 곳을 SoT 로 읽으면서도 성공한 척한다. 그게 silent fallback 이다.
 *
 * ⚠️ 이 함수는 **throw 한다.** 모듈 로드 시점(top-level)에서 부르지 마라 —
 * 라우트 모듈이 로드조차 안 돼 앱 전체가 죽는다. 요청 처리 중에 lazy 로 부르고
 * 실패를 `ok:false` 로 표면화해라.
 */
export function resolveRepoRoot(): string {
  const env = process.env.YOHAN_OS_ROOT?.trim()
  if (!env) {
    throw new Error(
      "YOHAN_OS_ROOT 미설정 — brain 레포 루트를 알 수 없습니다. .env.local 에 절대경로를 지정하세요."
    )
  }
  const root = resolve(/* turbopackIgnore: true */ env)
  if (!existsSync(join(/* turbopackIgnore: true */ root, "memory"))) {
    throw new Error(`YOHAN_OS_ROOT 가 brain 이 아닙니다 — memory/ 가 없음: ${root}`)
  }
  return root
}

/**
 * 형제 레포 스캔 루트 — `goals/*.md`·`.vhk/events/*.jsonl` 집계 대상(v1.1).
 *
 * `YOHAN_OS_ROOT` 는 brain 하나를 가리키므로 여러 레포를 훑으려면 별도 env 가 필요하다.
 * `cwd/..` 로 추론하지 않는 이유는 위와 같다.
 */
export function resolveReposRoot(): string {
  const env = process.env.YOHAN_REPOS_ROOT?.trim()
  if (!env) {
    throw new Error(
      "YOHAN_REPOS_ROOT 미설정 — 레포 스캔 루트를 알 수 없습니다. .env.local 에 절대경로를 지정하세요."
    )
  }
  return resolve(/* turbopackIgnore: true */ env)
}

/**
 * 로컬 Calendar 원장 루트 — `items/*.md`의 소유 경로.
 *
 * 개인정보가 들어갈 수 있어 앱 소스·Brain·Notion에서 추론하지 않는다. PC마다
 * `YOHAN_CALENDAR_ROOT` 절대경로를 명시해야 하며, 디렉터리는 첫 항목 생성 시 만든다.
 */
export function resolveCalendarRoot(): string {
  const env = process.env.YOHAN_CALENDAR_ROOT?.trim()
  if (!env) {
    throw new Error(
      "YOHAN_CALENDAR_ROOT 미설정 — Calendar 원장 위치를 알 수 없습니다. .env.local 에 절대경로를 지정하세요."
    )
  }
  if (!isAbsolute(env)) {
    throw new Error("YOHAN_CALENDAR_ROOT 는 절대경로여야 합니다.")
  }
  return resolve(/* turbopackIgnore: true */ env)
}

/**
 * brain 루트의 `.env` 를 프로세스 env 에 병합한다 (`OPENAI_API_KEY` 등).
 *
 * 이관 전에는 라우트마다 모듈 로드 시점에 `resolve(cwd, "..", ".env")` 를 읽었다.
 * dashboard 가 `brain/dashboard` 안에 있을 때만 `..` 이 brain 이었고, 옮겨오면
 * `yohan-ecosystem/` 을 가리켜 **아무것도 안 읽는다** — dev 로그의 `injected env (0)`
 * 가 그 실측이다. `api/run` 의 F1 과 같은 결함이었다(ARCHITECTURE §6-③).
 *
 * lazy 인 이유는 `resolveRepoRoot()` 가 throw 하기 때문이다. 모듈 레벨에서 부르면
 * 라우트가 로드조차 안 된다. 로드 실패는 여기서 흡수하되 **키 부재로 표면화된다** —
 * 호출부가 그 사실을 응답에 드러내야 한다(`/api/search` 는 `method:"keyword"`).
 */
let brainEnvLoaded = false
export function loadBrainEnv(): void {
  if (brainEnvLoaded) return
  brainEnvLoaded = true
  try {
    loadDotenv({ path: join(/* turbopackIgnore: true */ resolveRepoRoot(), ".env") })
  } catch (e) {
    console.warn(
      "[paths] brain .env 로드 실패 — 키가 필요한 기능은 대체 모드로 동작합니다:",
      e instanceof Error ? e.message : e
    )
  }
}

export function getMemoryDir(): string {
  return join(/* turbopackIgnore: true */ resolveRepoRoot(), "memory")
}

/** 밤루프 감사 리포트(overnight-*.md) + 이월 큐(overnight-deferred.json) 디렉토리. */
export function getAuditsDir(): string {
  return join(/* turbopackIgnore: true */ resolveRepoRoot(), "docs", "audits")
}

/**
 * yohan-studio(형제 레포) 블로그 콘텐츠 디렉토리.
 * brain 루트 기준 `../yohan-studio/src/content/blog`.
 * 부재 시 동작은 `lib/publish.ts` 가 `available:false` 로 명시 보고한다(§5).
 */
export function getStudioBlogDir(): string {
  return join(/* turbopackIgnore: true */ resolveRepoRoot(), "..", "yohan-studio", "src", "content", "blog")
}
