import { NextRequest, NextResponse } from "next/server"
import { listDocs } from "@/lib/memory"
import { resolve } from "node:path"
import { config } from "dotenv"

export const dynamic = "force-dynamic"

config({ path: resolve(/* turbopackIgnore: true */ process.cwd(), "..", ".env") })

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "query required" }, { status: 400 })
  }

  const docs = await listDocs()
  const key = process.env.OPENAI_API_KEY?.trim()

  if (!key) {
    const q = query.toLowerCase()
    const results = docs
      .filter((d) => d.title.toLowerCase().includes(q) || d.excerpt.toLowerCase().includes(q) || d.tags.some((t) => t.toLowerCase().includes(q)))
      .slice(0, 8)
    return NextResponse.json({ results, method: "keyword" })
  }

  const docList = docs.slice(0, 80).map((d, i) =>
    `[${i}] ${d.title} (${d.category}, ${d.date ?? "?"}) tags:${d.tags.join(",") || "none"}`
  ).join("\n")

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `사용자가 자연어로 문서를 찾으려 한다. 아래 문서 목록에서 관련 문서의 인덱스를 JSON 배열로 반환해. 최대 5개. 형식: [0, 3, 7]
관련 없으면 빈 배열 [].
문서 목록:
${docList}`,
        },
        { role: "user", content: query },
      ],
      temperature: 0,
      max_tokens: 100,
    }),
  })

  if (!res.ok) {
    const q = query.toLowerCase()
    const results = docs
      .filter((d) => d.title.toLowerCase().includes(q) || d.excerpt.toLowerCase().includes(q))
      .slice(0, 8)
    return NextResponse.json({ results, method: "keyword-fallback" })
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? "[]"

  let indices: number[] = []
  try {
    const parsed = JSON.parse(content.match(/\[[\d,\s]*\]/)?.[0] ?? "[]")
    indices = Array.isArray(parsed) ? parsed.filter((n: unknown) => typeof n === "number" && n >= 0 && n < docs.length) : []
  } catch {
    indices = []
  }

  const results = indices.map((i) => docs[i]).filter(Boolean)
  return NextResponse.json({ results, method: "ai" })
}
