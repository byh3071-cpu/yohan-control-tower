import type { DocMeta } from "./types"
import {
  AI_RESPONSE_INVALID_MESSAGE,
  type SearchFailureResponse,
  type SearchSuccessResponse,
} from "./search-response"

const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions"
const OPENAI_MODEL = "gpt-4o-mini"
const MAX_AI_DOCS = 80
const MAX_AI_RESULTS = 5
const MAX_KEYWORD_RESULTS = 8

export interface SearchHandlerDependencies {
  listDocs: () => Promise<DocMeta[]>
  getApiKey: () => string | undefined
  fetchUpstream: (input: string | URL | Request, init?: RequestInit) => Promise<Response>
}

function json(body: SearchSuccessResponse | SearchFailureResponse | { error: string }, status = 200): Response {
  return Response.json(body, { status })
}

function invalidAiResponse(): Response {
  return json({
    ok: false,
    code: "AI_RESPONSE_INVALID",
    error: AI_RESPONSE_INVALID_MESSAGE,
    results: [],
    method: "ai",
  }, 502)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readContent(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return null
  const firstChoice = payload.choices[0]
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return null
  return typeof firstChoice.message.content === "string" ? firstChoice.message.content : null
}

function extractTopLevelArrayCandidates(content: string): string[] | null {
  const candidates: string[] = []
  let depth = 0
  let start = -1

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    if (character === "[") {
      if (depth === 0) start = index
      depth += 1
      continue
    }
    if (character !== "]") continue
    if (depth === 0) return null

    depth -= 1
    if (depth === 0) {
      candidates.push(content.slice(start, index + 1))
      start = -1
    }
  }

  return depth === 0 ? candidates : null
}

function parseAiIndices(content: string, docCount: number): number[] | null {
  const arrayTexts = extractTopLevelArrayCandidates(content)
  if (!arrayTexts || arrayTexts.length !== 1) return null
  const arrayText = arrayTexts[0]

  let parsed: unknown
  try {
    parsed = JSON.parse(arrayText)
  } catch {
    return null
  }

  if (!Array.isArray(parsed) || parsed.length > MAX_AI_RESULTS) return null
  if (!parsed.every((index): index is number => Number.isInteger(index) && index >= 0 && index < docCount)) return null
  if (new Set(parsed).size !== parsed.length) return null
  return parsed
}

function keywordSearch(docs: DocMeta[], query: string, includeTags: boolean): DocMeta[] {
  const normalizedQuery = query.toLowerCase()
  return docs
    .filter((doc) => doc.title.toLowerCase().includes(normalizedQuery)
      || doc.excerpt.toLowerCase().includes(normalizedQuery)
      || (includeTags && doc.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))))
    .slice(0, MAX_KEYWORD_RESULTS)
}

function buildDocumentList(docs: DocMeta[]): string {
  return docs.map((doc, index) =>
    `[${index}] ${doc.title} (${doc.category}, ${doc.date ?? "?"}) tags:${doc.tags.join(",") || "none"}`
  ).join("\n")
}

export function createSearchHandler(dependencies: SearchHandlerDependencies) {
  return async function handleSearch(request: Request): Promise<Response> {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: "query required" }, 400)
    }

    if (!isRecord(body) || typeof body.query !== "string" || !body.query) {
      return json({ error: "query required" }, 400)
    }

    const query = body.query
    const docs = await dependencies.listDocs()
    const key = dependencies.getApiKey()?.trim()

    if (!key) {
      return json({ results: keywordSearch(docs, query, true), method: "keyword" })
    }

    const candidateDocs = docs.slice(0, MAX_AI_DOCS)
    const upstreamResponse = await dependencies.fetchUpstream(OPENAI_CHAT_COMPLETIONS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content: `사용자가 자연어로 문서를 찾으려 한다. 아래 문서 목록에서 관련 문서의 인덱스를 JSON 배열로 반환해. 최대 5개. 형식: [0, 3, 7]
관련 없으면 빈 배열 [].
문서 목록:
${buildDocumentList(candidateDocs)}`,
          },
          { role: "user", content: query },
        ],
        temperature: 0,
        max_tokens: 100,
      }),
    })

    if (!upstreamResponse.ok) {
      return json({ results: keywordSearch(docs, query, false), method: "keyword-fallback" })
    }

    let payload: unknown
    try {
      payload = await upstreamResponse.json()
    } catch {
      return invalidAiResponse()
    }

    const content = readContent(payload)
    if (content === null) return invalidAiResponse()
    const indices = parseAiIndices(content, candidateDocs.length)
    if (indices === null) return invalidAiResponse()

    return json({ results: indices.map((index) => candidateDocs[index]), method: "ai" })
  }
}
