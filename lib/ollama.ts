/**
 * Ollama 로컬 임베딩 클라이언트 (bge-m3, 1024차원).
 * 비용 0 원칙: 외부 API 금지, 전부 localhost:11434.
 * 모델은 yohan-mcp(get_context 소비측)와 동일한 bge-m3 — 같은 벡터공간이라 검색 정합 보장.
 */
import { Ollama } from 'ollama'
import { VECTOR_SIZE } from './collections'

const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'http://localhost:11434'
export const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? 'bge-m3'

// 임베딩 요청 타임아웃(ms). ollama 라이브러리는 자체 타임아웃이 없어 Ollama 무응답 시
// embed() 가 무한 대기 → 커스텀 fetch 로 AbortSignal.timeout 을 주입해 hang 방지.
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 30000

let client: Ollama | null = null

function getOllama(): Ollama {
  if (!client) {
    client = new Ollama({
      host: OLLAMA_HOST,
      fetch: (input, init) => {
        const timeoutSignal = AbortSignal.timeout(OLLAMA_TIMEOUT_MS)
        // 라이브러리가 자체 signal 을 넘기면 둘 다 존중(먼저 발동하는 쪽이 중단).
        const signal = init?.signal
          ? AbortSignal.any([init.signal, timeoutSignal])
          : timeoutSignal
        return fetch(input, { ...init, signal })
      },
    })
  }
  return client
}

/** 단일 텍스트 → 1024차원 임베딩. 차원 불일치 시 모델 오설정으로 보고 throw. */
export async function embed(text: string): Promise<number[]> {
  const res = await getOllama().embeddings({ model: EMBED_MODEL, prompt: text })
  const v = res.embedding
  if (!Array.isArray(v) || v.length !== VECTOR_SIZE) {
    throw new Error(
      `임베딩 차원 불일치: ${v?.length ?? 'none'} (기대 ${VECTOR_SIZE}). 모델 확인 필요: ${EMBED_MODEL}`,
    )
  }
  return v
}

/** 배치 임베딩(순차 — 4060Ti 8GB 부하/메모리 안정성 우선). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (const t of texts) out.push(await embed(t))
  return out
}

/** Ollama 서버 + 임베딩 모델 가용성 확인. */
export async function ollamaStatus(): Promise<{ available: boolean; model: string; error?: string }> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (!res.ok) return { available: false, model: EMBED_MODEL, error: `HTTP ${res.status}` }
    const json = (await res.json()) as { models?: Array<{ name: string }> }
    const names = (json.models ?? []).map((m) => m.name)
    const hasModel = names.some((n) => n === EMBED_MODEL || n.startsWith(`${EMBED_MODEL}:`))
    if (!hasModel) {
      return {
        available: false,
        model: EMBED_MODEL,
        error: `모델 미설치: ${EMBED_MODEL} — 'ollama pull ${EMBED_MODEL}' 필요`,
      }
    }
    return { available: true, model: EMBED_MODEL }
  } catch (e) {
    return {
      available: false,
      model: EMBED_MODEL,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export { OLLAMA_HOST }
