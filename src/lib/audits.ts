import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { getAuditsDir } from "./paths"

/** 밤루프 아침 보고(overnight-YYYY-MM-DD.md) 1건 요약. */
export interface OvernightSummary {
  file: string
  date: string | null
  title: string
  /** "## 결론" 섹션의 최상위 불릿(최대 N개, 원문 그대로). */
  conclusion: string[]
}

export interface DeferredDefect {
  repo: string
  title: string
  severity: string
  fixable: boolean
}

/** overnight-deferred.json(이월 큐) 집계. */
export interface DeferredQueue {
  savedAt: string | null
  count: number
  bySeverity: Record<string, number>
  byRepo: Record<string, number>
}

function extractTitle(md: string): string {
  const m = md.match(/^#\s+(.+)$/m)
  return m ? m[1].trim() : "(제목 없음)"
}

function extractConclusionBullets(md: string, max = 5): string[] {
  const lines = md.split(/\r?\n/)
  const startIdx = lines.findIndex((l) => /^##\s*결론\s*$/.test(l.trim()))
  if (startIdx === -1) return []
  const bullets: string[] = []
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    if (/^##\s/.test(line)) break // 다음 섹션 시작 — 결론 종료
    const bm = line.match(/^\s*-\s+(.+)$/)
    if (bm) bullets.push(bm[1].trim())
    if (bullets.length >= max) break
  }
  return bullets
}

/** 최신 밤루프 보고 N건(파일명 날짜 내림차순) 요약. 디렉토리/파일 접근 실패는 빈 배열로 degrade. */
export async function getOvernightSummaries(limit = 2): Promise<OvernightSummary[]> {
  const dir = getAuditsDir()
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    return []
  }
  const files = entries
    .filter((f) => /^overnight-\d{4}-\d{2}-\d{2}\.md$/.test(f))
    .sort()
    .reverse()
    .slice(0, limit)

  const summaries: OvernightSummary[] = []
  for (const file of files) {
    try {
      const raw = await readFile(join(/* turbopackIgnore: true */ dir, file), "utf8")
      const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/)
      summaries.push({
        file,
        date: dateMatch ? dateMatch[1] : null,
        title: extractTitle(raw),
        conclusion: extractConclusionBullets(raw),
      })
    } catch {
      // 개별 파일 읽기 실패 — 해당 파일만 건너뜀(graceful)
    }
  }
  return summaries
}

/** 이월 결함 큐 집계(심각도·레포별 건수). 파일 없음/파싱 실패는 빈 집계로 degrade. */
export async function getDeferredQueue(): Promise<DeferredQueue> {
  const dir = getAuditsDir()
  try {
    const raw = await readFile(join(/* turbopackIgnore: true */ dir, "overnight-deferred.json"), "utf8")
    const data = JSON.parse(raw) as { savedAt?: string; defects?: DeferredDefect[] }
    const defects = Array.isArray(data.defects) ? data.defects : []
    const bySeverity: Record<string, number> = {}
    const byRepo: Record<string, number> = {}
    for (const d of defects) {
      const sev = d.severity ?? "unknown"
      const repo = d.repo ?? "unknown"
      bySeverity[sev] = (bySeverity[sev] ?? 0) + 1
      byRepo[repo] = (byRepo[repo] ?? 0) + 1
    }
    return { savedAt: data.savedAt ?? null, count: defects.length, bySeverity, byRepo }
  } catch {
    return { savedAt: null, count: 0, bySeverity: {}, byRepo: {} }
  }
}
