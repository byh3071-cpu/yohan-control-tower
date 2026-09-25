import type { DocCategory, DocMeta } from "./types"

export const AI_RESPONSE_INVALID_MESSAGE = "AI 검색 응답을 해석하지 못했습니다. 잠시 후 다시 시도해 주세요."
export const SEARCH_REQUEST_FAILED_MESSAGE = "검색에 실패했습니다. 잠시 후 다시 시도해 주세요."
export const SEARCH_RESPONSE_MALFORMED_MESSAGE = "검색 응답 형식이 올바르지 않습니다."

export type SearchMethod = "ai" | "keyword" | "keyword-fallback"

export interface SearchSuccessResponse {
  results: DocMeta[]
  method: SearchMethod
}

export interface SearchFailureResponse {
  ok: false
  code: "AI_RESPONSE_INVALID"
  error: string
  results: []
  method: "ai"
}

export type SearchClientResult =
  | { ok: true; value: SearchSuccessResponse }
  | { ok: false; error: string }

const SEARCH_METHODS = new Set<SearchMethod>(["ai", "keyword", "keyword-fallback"])
const DOC_CATEGORIES = new Set<DocCategory>([
  "insights",
  "rss",
  "url",
  "wiki",
  "curriculum",
  "projects",
  "decisions",
  "rules",
  "templates",
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isDocMeta(value: unknown): value is DocMeta {
  if (!isRecord(value)) return false
  return typeof value.id === "string"
    && typeof value.title === "string"
    && isNullableString(value.date)
    && isStringArray(value.tags)
    && isStringArray(value.related)
    && typeof value.category === "string"
    && DOC_CATEGORIES.has(value.category as DocCategory)
    && isNullableString(value.status)
    && typeof value.relPath === "string"
    && typeof value.excerpt === "string"
    && isNullableString(value.sourceName)
}

export function parseSearchClientResponse(httpOk: boolean, status: number, payload: unknown): SearchClientResult {
  if (!httpOk) {
    if (isRecord(payload) && payload.code === "AI_RESPONSE_INVALID") {
      return { ok: false, error: AI_RESPONSE_INVALID_MESSAGE }
    }
    return { ok: false, error: `${SEARCH_REQUEST_FAILED_MESSAGE} (${status})` }
  }

  if (!isRecord(payload)
    || !Array.isArray(payload.results)
    || !payload.results.every(isDocMeta)
    || typeof payload.method !== "string"
    || !SEARCH_METHODS.has(payload.method as SearchMethod)) {
    return { ok: false, error: SEARCH_RESPONSE_MALFORMED_MESSAGE }
  }

  return {
    ok: true,
    value: {
      results: payload.results,
      method: payload.method as SearchMethod,
    },
  }
}
