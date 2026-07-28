import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import matter from "gray-matter"
import { getStudioBlogDir } from "./paths"

export interface PublishItem {
  slug: string
  title: string
  published: boolean
  date: string | null
}

/**
 * 발행 현황.
 *
 * `available` 로 **"읽을 수 없었다"와 "읽었는데 0편이다"를 구별**한다.
 * 이전에는 실패 시 `{total:0, published:0, draft:0}` 을 정상값처럼 반환해서
 * 형제 레포 부재와 "글 0편"이 화면에서 똑같이 보였다 — silent fallback 이고
 * ARCHITECTURE §6-⑤ 위반이다.
 */
export type PublishStatus =
  | { available: true; total: number; published: number; draft: number; latest: PublishItem[] }
  | { available: false; reason: string }

/**
 * yohan-studio(형제 레포) 블로그 발행 현황. `*.mdx` 프론트매터의 `published`(boolean)를 집계한다.
 * 레포 부재·경로 접근 불가는 **실패로 보고**한다(요청 자체는 실패시키지 않음).
 */
export async function getPublishStatus(limit = 5): Promise<PublishStatus> {
  let dir: string
  try {
    dir = getStudioBlogDir()
  } catch (e) {
    // resolveRepoRoot() throw — YOHAN_OS_ROOT 미설정 등
    return { available: false, reason: e instanceof Error ? e.message : "brain 경로 해석 실패" }
  }

  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch (e) {
    const code = (e as NodeJS.ErrnoException)?.code
    return {
      available: false,
      reason:
        code === "ENOENT"
          ? `형제 레포 yohan-studio 를 찾을 수 없습니다 (${dir})`
          : `블로그 디렉토리 읽기 실패 (${code ?? "unknown"})`,
    }
  }

  const files = entries.filter((f) => f.endsWith(".mdx"))
  const items: PublishItem[] = []

  for (const file of files) {
    try {
      const raw = await readFile(join(/* turbopackIgnore: true */ dir, file), "utf8")
      const { data } = matter(raw)
      items.push({
        slug: file.replace(/\.mdx$/, ""),
        title: typeof data.title === "string" ? data.title : file,
        published: data.published === true,
        date: typeof data.date === "string" ? data.date : null,
      })
    } catch {
      // 개별 파일 프론트매터 파싱 실패 — 해당 파일만 건너뜀(디렉토리는 읽혔으므로 available 유지)
    }
  }

  const published = items.filter((i) => i.published).length
  const latest = [...items]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, limit)

  return { available: true, total: items.length, published, draft: items.length - published, latest }
}
