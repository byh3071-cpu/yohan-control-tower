/**
 * 인제스트 엔진 — 노션 조회 → 청킹 → Ollama 임베딩 → Qdrant upsert.
 *
 * 원칙:
 * - source_system: 'notion' 메타데이터 항상 부여.
 * - 레코드 단위로 묶어 처리: 한 페이지가 실패해도 전체 중단 없이 계속(검증 #10).
 * - 포인트 ID는 결정적 → 재인제스트 멱등.
 */
import type {
  NotionRecord,
  PointPayload,
  QdrantPoint,
  IngestSummary,
  IngestError,
} from './types'
import {
  getSource,
  resolveNotionId,
  sourcesByTier,
  type SourceConfig,
} from './sources'
import { loadRecords, loadPage } from './notion'
import { chunkText } from './chunking'
import { embed } from './ollama'
import { ensureAllCollections, upsertPoints, pointId } from './qdrant'
import { getProducer } from './producers'

/** 한 레코드에서 나오는 의미 단위. 각 piece 가 청킹되어 1개 이상의 sub-chunk 가 된다. */
export interface IngestUnit {
  record: NotionRecord
  pieces: Array<{ text: string; section?: string }>
  payload: Partial<Pick<PointPayload, 'category' | 'priority' | 'rule_type' | 'resource_type'>>
}

export type Producer = (records: NotionRecord[]) => IngestUnit[]

interface SubChunk {
  record: NotionRecord
  text: string
  section?: string
  index: number
  total: number
  payload: IngestUnit['payload']
}

/** 단일 소스 인제스트 실행. */
export async function runIngest(
  cfg: SourceConfig,
  producer: Producer,
  onLog: (line: string) => void = () => {},
): Promise<IngestSummary> {
  const start = Date.now()
  const logs: string[] = []
  const log = (line: string): void => {
    logs.push(line)
    onLog(line)
  }

  await ensureAllCollections()
  log(`${cfg.label} 인제스트 시작...`)

  // 1) 노션 조회 (page=loadPage, database=loadRecords)
  const notionId = resolveNotionId(cfg)
  const records: NotionRecord[] =
    cfg.kind === 'page' ? [await loadPage(notionId)] : await loadRecords(notionId)
  log(`Notion: ${records.length}건 조회 완료`)

  // 2) 생성기 → 단위 → 청킹(512토큰/50오버랩)
  const units = producer(records)
  const subs: SubChunk[] = []
  for (const unit of units) {
    const flat: Array<{ text: string; section?: string }> = []
    for (const piece of unit.pieces) {
      for (const c of chunkText(piece.text)) flat.push({ text: c, section: piece.section })
    }
    const total = flat.length
    flat.forEach((p, i) =>
      subs.push({
        record: unit.record,
        text: p.text,
        section: p.section,
        index: i,
        total,
        payload: unit.payload,
      }),
    )
  }
  log(`청킹: ${units.length}건 → ${subs.length}청크`)

  // 3) 레코드별로 묶어 임베딩 + upsert (부분 실패 격리)
  const byRecord = new Map<string, SubChunk[]>()
  for (const s of subs) {
    const arr = byRecord.get(s.record.id) ?? []
    arr.push(s)
    byRecord.set(s.record.id, arr)
  }

  // upserted/chunksFailed 는 청크 단위, recordsFailed 는 레코드(그룹) 단위 — 절대 혼용 금지.
  let upserted = 0
  let recordsFailed = 0
  const errors: IngestError[] = []

  for (const group of byRecord.values()) {
    const title = group[0]?.record.title ?? '(unknown)'
    // 그룹은 한 레코드의 모든 청크 → upsert 실패 시 group.length 청크 전부 손실.
    const groupChunks = group.length
    try {
      const points: QdrantPoint[] = []
      for (const s of group) {
        const vector = await embed(s.text)
        const payload: PointPayload = {
          source_system: 'notion',
          source_db: cfg.source,
          notion_page_id: s.record.id,
          notion_page_url: s.record.url,
          title: s.record.title,
          text: s.text,
          chunk_index: s.index,
          total_chunks: s.total,
          created_time: s.record.createdTime,
          last_edited_time: s.record.lastEditedTime,
          ...(s.section ? { section: s.section } : {}),
          ...s.payload,
        }
        points.push({ id: pointId(s.record.id, s.index), vector, payload })
      }
      upserted += await upsertPoints(cfg.collection, points)
    } catch (e) {
      recordsFailed += 1
      const message = e instanceof Error ? e.message : String(e)
      errors.push({ page: title, message, chunksLost: groupChunks })
      log(`  ⚠️ 실패: ${title} — ${message} (${groupChunks}청크 손실)`)
    }
  }

  // 청크 손실 규모 = 생성된 총 청크 − 저장 성공 청크(부분 upsert 없음: 그룹 실패 시 전량 미저장).
  const chunksFailed = subs.length - upserted

  log(
    `임베딩+저장: ${upserted}청크 완료` +
      (recordsFailed ? ` (${recordsFailed}레코드 / ${chunksFailed}청크 손실)` : ''),
  )
  log(`✅ 완료: ${cfg.collection} ← ${upserted}청크 / ${records.length}건 (${Date.now() - start}ms)`)

  return {
    source_db: cfg.source,
    collection: cfg.collection,
    pages: records.length,
    chunks: subs.length,
    upserted,
    recordsFailed,
    chunksFailed,
    errors,
    durationMs: Date.now() - start,
    logs,
  }
}

/** slug → 인제스트 실행(생성기 자동 선택). */
export async function ingestBySlug(
  slug: string,
  onLog?: (line: string) => void,
): Promise<IngestSummary> {
  const cfg = getSource(slug)
  if (!cfg) throw new Error(`알 수 없는 소스 slug: ${slug}`)
  return runIngest(cfg, getProducer(cfg), onLog)
}

/** 라우트 핸들러 팩토리: POST → 단일 소스 인제스트. */
export function ingestHandler(slug: string) {
  return async function POST(): Promise<Response> {
    try {
      const summary = await ingestBySlug(slug)
      return Response.json(summary)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      return Response.json({ error: message }, { status: 500 })
    }
  }
}

/** 라우트 핸들러 팩토리: POST → Tier 전체 인제스트(순차). */
export function ingestTierHandler(tier: 1 | 2 | 3) {
  return async function POST(): Promise<Response> {
    const results: IngestSummary[] = []
    for (const cfg of sourcesByTier(tier)) {
      try {
        results.push(await runIngest(cfg, getProducer(cfg)))
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e)
        // 소스 전체 실패(레코드 조회 이전 예외) → 청크 미생성이라 chunksFailed 는 0.
        results.push({
          source_db: cfg.source,
          collection: cfg.collection,
          pages: 0,
          chunks: 0,
          upserted: 0,
          recordsFailed: 1,
          chunksFailed: 0,
          errors: [{ page: cfg.label, message, chunksLost: 0 }],
          durationMs: 0,
          logs: [`${cfg.label} 실패: ${message}`],
        })
      }
    }
    return Response.json({ tier, results })
  }
}
