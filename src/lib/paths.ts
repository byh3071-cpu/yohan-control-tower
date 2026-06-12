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
