import { existsSync } from "node:fs"
import { join, resolve } from "node:path"

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
