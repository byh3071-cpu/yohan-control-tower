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

export interface PublishStatus {
  total: number
  published: number
  draft: number
  latest: PublishItem[]
}

const EMPTY: PublishStatus = { total: 0, published: 0, draft: 0, latest: [] }

/**
 * yohan-studio(형제 레포) 블로그 발행 현황. `*.mdx` 프론트매터의 `published`(boolean)를 집계한다.
 * 형제 레포가 없거나 경로 접근 불가하면 EMPTY 로 degrade(요청 실패시키지 않음).
 */
export async function getPublishStatus(limit = 5): Promise<PublishStatus> {
  const dir = getStudioBlogDir()
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return EMPTY
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
      // 개별 파일 프론트매터 파싱 실패 — 해당 파일만 건너뜀(graceful)
    }
  }

  const published = items.filter((i) => i.published).length
  const latest = [...items]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, limit)

  return { total: items.length, published, draft: items.length - published, latest }
}
