import { NextResponse } from "next/server"
import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { clearDocsCache } from "@/lib/docs-cache"
import { getMemoryDir } from "@/lib/paths"

export const dynamic = "force-dynamic"

const MEMORY_ROOT = getMemoryDir()

const TARGET_PREFIX: Record<string, string> = {
  insights: "ingest/insights",
  decisions: "decisions",
}

type DraftKind = "insight" | "decision" | "plan"

function seoulYmdHm(): { ymd: string; hm: string } {
  const d = new Date()
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(d)
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d)
  const hh = parts.find((p) => p.type === "hour")?.value.padStart(2, "0") ?? "00"
  const mm = parts.find((p) => p.type === "minute")?.value.padStart(2, "0") ?? "00"
  return { ymd, hm: `${hh}${mm}` }
}

function slugify(title: string): string {
  const t = title.trim().slice(0, 120)
  const s = t
    .toLowerCase()
    .replace(/[^a-z0-9\uAC00-\uD7A3\s-]/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
  return s || "draft"
}

function yamlQuote(s: string): string {
  const esc = s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `"${esc}"`
}

function tagsYamlBlock(tags: string[]): string {
  if (tags.length === 0) return "tags: []"
  return `tags:\n${tags.map((t) => `  - ${yamlQuote(t)}`).join("\n")}`
}

function buildFrontMatter(
  target: "insights" | "decisions",
  draftKind: DraftKind,
  id: string,
  ymd: string,
  title: string,
  tags: string[],
  domain?: string
): string {
  const ty = tagsYamlBlock(tags)

  if (target === "decisions") {
    const created = new Date().toISOString()
    return `---
id: ${yamlQuote(id)}
title: ${yamlQuote(title.trim())}
date: ${yamlQuote(ymd)}
created: ${yamlQuote(created)}
${ty}
source: dashboard-api
---

`
  }

  const status = draftKind === "plan" ? "plan" : "insight"
  const domainLine =
    domain && domain.trim().length > 0 ? `domain: ${yamlQuote(domain.trim().slice(0, 48))}\n` : ""

  return `---
id: ${yamlQuote(id)}
date: ${yamlQuote(ymd)}
title: ${yamlQuote(title.trim())}
${ty}
status: ${status}
source: dashboard-api
${domainLine}---

`
}

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 })
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 })
  }

  const o = body as Record<string, unknown>
  const target = o.target
  const title = o.title
  const bodyMarkdown = o.bodyMarkdown
  const tagsRaw = o.tags
  const draftKindRaw = o.draftKind
  const domainRaw = o.domain

  if (target !== "insights" && target !== "decisions") {
    return NextResponse.json({ error: "target must be insights | decisions" }, { status: 400 })
  }
  if (typeof title !== "string" || title.trim().length < 1 || title.length > 240) {
    return NextResponse.json({ error: "title length 1–240" }, { status: 400 })
  }
  if (typeof bodyMarkdown !== "string" || bodyMarkdown.length > 120_000) {
    return NextResponse.json({ error: "bodyMarkdown too large or missing" }, { status: 400 })
  }

  let draftKind: DraftKind = target === "decisions" ? "decision" : "insight"
  if (draftKindRaw !== undefined) {
    if (draftKindRaw !== "insight" && draftKindRaw !== "decision" && draftKindRaw !== "plan") {
      return NextResponse.json(
        { error: "draftKind must be insight | decision | plan" },
        { status: 400 }
      )
    }
    draftKind = draftKindRaw
  }

  if (target === "decisions" && draftKind !== "decision") {
    return NextResponse.json(
      { error: "target decisions requires draftKind decision" },
      { status: 400 }
    )
  }
  if (target === "insights" && draftKind === "decision") {
    return NextResponse.json(
      { error: "target insights cannot use draftKind decision" },
      { status: 400 }
    )
  }

  let domain: string | undefined
  if (domainRaw !== undefined) {
    if (typeof domainRaw !== "string" || domainRaw.length > 48) {
      return NextResponse.json({ error: "domain optional string max 48" }, { status: 400 })
    }
    domain = domainRaw.trim() || undefined
  }

  let tags: string[] = []
  if (tagsRaw !== undefined) {
    if (!Array.isArray(tagsRaw) || !tagsRaw.every((x) => typeof x === "string" && x.length < 80)) {
      return NextResponse.json({ error: "tags must be string[]" }, { status: 400 })
    }
    tags = tagsRaw.map((t) => t.trim()).filter(Boolean).slice(0, 24)
  }

  const prefix = TARGET_PREFIX[target]
  const { ymd, hm } = seoulYmdHm()
  const slug = slugify(title)
  const id =
    target === "decisions"
      ? `${ymd}-${hm}-${slug}`
      : `${ymd}-${hm}-sot-${slug}`
  const fileName = `${id}.md`
  const relPath = `${prefix}/${fileName}`
  const dir = join(/* turbopackIgnore: true */ MEMORY_ROOT, prefix)
  const absPath = join(/* turbopackIgnore: true */ dir, fileName)

  const fm = buildFrontMatter(target, draftKind, id, ymd, title, tags, target === "insights" ? domain : undefined)
  const out = `${fm}${bodyMarkdown.trim()}\n`

  try {
    await mkdir(dir, { recursive: true })
    await writeFile(absPath, out, "utf8")
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: "write failed", detail: msg }, { status: 500 })
  }

  clearDocsCache()

  return NextResponse.json({ ok: true, relPath, draftKind })
}
