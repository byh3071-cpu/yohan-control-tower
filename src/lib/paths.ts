import { existsSync } from "node:fs"
import { join, resolve } from "node:path"

/**
 * Yohan OS repo root for dashboard server.
 * 1. YOHAN_OS_ROOT env
 * 2. cwd if cwd/memory exists (repo root start)
 * 3. cwd/.. if ../memory exists (dashboard/ start)
 * 4. fallback: cwd/.. (legacy)
 */
export function resolveRepoRoot(): string {
  const env = process.env.YOHAN_OS_ROOT?.trim()
  if (env) return resolve(/* turbopackIgnore: true */ env)

  const cwd = resolve(/* turbopackIgnore: true */ process.cwd())
  if (existsSync(join(/* turbopackIgnore: true */ cwd, "memory"))) return cwd
  if (existsSync(join(/* turbopackIgnore: true */ cwd, "..", "memory"))) {
    return resolve(/* turbopackIgnore: true */ cwd, "..")
  }
  return resolve(/* turbopackIgnore: true */ cwd, "..")
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
 * repo root 기준 `../yohan-studio/src/content/blog` — 레포가 없거나 경로가 다르면
 * 호출측(fs 접근 시점)에서 ENOENT 로 자연 실패하므로 존재를 미리 강제하지 않는다
 * (graceful degrade는 API route 쪽 책임).
 */
export function getStudioBlogDir(): string {
  return join(/* turbopackIgnore: true */ resolveRepoRoot(), "..", "yohan-studio", "src", "content", "blog")
}
