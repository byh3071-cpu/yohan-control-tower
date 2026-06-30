/**
 * 청킹 로직 (스펙: 512 토큰 / 50 오버랩 / 문단 우선 / 최소 50 병합).
 *
 * 비용 0 원칙상 외부 토크나이저를 쓰지 않고 한국어+영문 혼합을 고려한 근사 토큰 추정을 쓴다.
 * 근사이므로 청크 크기는 ±오차가 있으나 nomic-embed-text(최대 2048토큰)에는 충분히 보수적이다.
 */
import type { Chunk } from './types'

export const MAX_TOKENS = 512
export const OVERLAP_TOKENS = 50
export const MIN_TOKENS = 50

const CJK = /[　-〿㐀-䶿一-鿿가-힯豈-﫿]/g
const SENTENCE_SPLIT = /(?<=[.!?。！？…])\s+|\n+/

/** 한국어/CJK 글자는 ~1토큰, 영문은 단어*1.3 으로 근사. */
export function estimateTokens(text: string): number {
  const cjk = (text.match(CJK) || []).length
  const rest = text.replace(CJK, ' ')
  const words = rest.split(/\s+/).filter(Boolean).length
  return cjk + Math.ceil(words * 1.3)
}

export interface ChunkOptions {
  maxTokens?: number
  overlapTokens?: number
  minTokens?: number
}

/** 텍스트 → 청크 문자열 배열. */
export function chunkText(input: string, opts: ChunkOptions = {}): string[] {
  const maxTokens = opts.maxTokens ?? MAX_TOKENS
  const overlapTokens = opts.overlapTokens ?? OVERLAP_TOKENS
  const minTokens = opts.minTokens ?? MIN_TOKENS

  const text = input.trim()
  if (!text) return []

  const paragraphs = text.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean)

  const chunks: string[] = []
  let current: string[] = []
  let currentTokens = 0

  const flush = (): string => {
    const joined = current.join('\n\n')
    current = []
    currentTokens = 0
    return joined
  }

  for (const para of paragraphs) {
    const paraTokens = estimateTokens(para)

    // 문단 1개가 한도를 넘으면 현재 청크를 닫고 문장 단위로 쪼갠다.
    if (paraTokens > maxTokens) {
      if (current.length > 0) chunks.push(flush())
      for (const piece of splitLongParagraph(para, maxTokens)) chunks.push(piece)
      continue
    }

    // 현재 청크에 더 넣으면 한도 초과 → 닫고, 꼬리 일부를 다음 청크로 오버랩.
    if (currentTokens + paraTokens > maxTokens && current.length > 0) {
      const prev = flush()
      chunks.push(prev)
      const tail = tailTokens(prev, overlapTokens)
      if (tail) {
        current.push(tail)
        currentTokens = estimateTokens(tail)
      }
    }

    current.push(para)
    currentTokens += paraTokens
  }
  if (current.length > 0) chunks.push(flush())

  return mergeShort(chunks, minTokens)
}

/** 청크 문자열 → Chunk 객체 배열(인덱스 부여). section 은 구조적 분할 라벨. */
export function toChunks(input: string, opts: ChunkOptions = {}, section?: string): Chunk[] {
  return chunkText(input, opts).map((text, index) => ({ text, index, section }))
}

/**
 * 본문을 마크다운 헤딩(#/##/###) 기준으로 섹션 분할.
 * 인물 DB 6섹션·헌법 조별 청킹용. 헤딩 앞 서두는 '서두' 섹션으로.
 * 각 섹션 텍스트에 헤딩을 포함(검색 맥락 보존).
 */
export function splitByHeadings(body: string): Array<{ section: string; text: string }> {
  const lines = body.split('\n')
  const sections: Array<{ section: string; text: string }> = []
  let label = ''
  let buf: string[] = []

  const flush = (): void => {
    const content = buf.join('\n').trim()
    buf = []
    // 본문 없는 섹션(라벨-only)은 정보량 0 청크이므로 스킵 — 헤딩 텍스트만 임베딩되는 빈청크 방지.
    if (!content) return
    const text = label ? `${label}\n${content}`.trim() : content
    sections.push({ section: label || '서두', text })
  }

  for (const line of lines) {
    const m = line.match(/^#{1,3}\s+(.*)$/)
    if (m) {
      flush()
      label = m[1].trim()
    } else {
      buf.push(line)
    }
  }
  flush()
  return sections.filter((s) => s.text.trim().length > 0)
}

// ── 내부 헬퍼 ──────────────────────────────────────────────

function splitLongParagraph(para: string, maxTokens: number): string[] {
  const sentences = para.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean)
  const out: string[] = []
  let buf: string[] = []
  let bufTok = 0

  for (const s of sentences) {
    const st = estimateTokens(s)
    if (st > maxTokens) {
      if (buf.length) {
        out.push(buf.join(' '))
        buf = []
        bufTok = 0
      }
      out.push(...hardCut(s, maxTokens))
      continue
    }
    if (bufTok + st > maxTokens && buf.length) {
      out.push(buf.join(' '))
      buf = []
      bufTok = 0
    }
    buf.push(s)
    bufTok += st
  }
  if (buf.length) out.push(buf.join(' '))
  return out
}

/** 문장 1개가 한도 초과 시 글자 기준 하드컷(토큰≈문자/2 근사). */
function hardCut(s: string, maxTokens: number): string[] {
  const approxChars = Math.max(1, maxTokens * 2)
  const out: string[] = []
  for (let i = 0; i < s.length; i += approxChars) out.push(s.slice(i, i + approxChars))
  return out
}

/** 텍스트 끝에서 overlapTokens 만큼의 문장을 떼어 오버랩 머리로 사용. */
function tailTokens(text: string, overlapTokens: number): string {
  if (overlapTokens <= 0) return ''
  const sentences = text.split(SENTENCE_SPLIT).map((s) => s.trim()).filter(Boolean)
  const acc: string[] = []
  let tok = 0
  for (let i = sentences.length - 1; i >= 0; i--) {
    const st = estimateTokens(sentences[i])
    if (tok + st > overlapTokens && acc.length) break
    acc.unshift(sentences[i])
    tok += st
  }
  return acc.join(' ')
}

/** 최소 토큰 미만 청크를 이웃 청크에 병합. */
function mergeShort(chunks: string[], minTokens: number): string[] {
  if (chunks.length <= 1) return chunks
  const out: string[] = []
  for (const c of chunks) {
    if (out.length > 0 && estimateTokens(c) < minTokens) {
      out[out.length - 1] = `${out[out.length - 1]}\n\n${c}`
    } else {
      out.push(c)
    }
  }
  // 첫 청크가 너무 짧으면 두 번째와 병합.
  if (out.length > 1 && estimateTokens(out[0]) < minTokens) {
    out[1] = `${out[0]}\n\n${out[1]}`
    out.shift()
  }
  return out
}
