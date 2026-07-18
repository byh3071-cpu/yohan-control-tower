/**
 * 인제스트 엔진 — 노션 조회 → 청킹 → Ollama 임베딩 → Qdrant upsert.
 *
 * 원칙:
 * - source_system: 'notion' 메타데이터 항상 부여.
 * - 레코드 단위로 묶어 처리: 한 페이지가 실패해도 전체 중단 없이 계속(검증 #10).
 * - 포인트 ID는 결정적 → 재인제스트 멱등.
 * - 노션 SoT 미러: upsert 후 잔존 청크(축소분)·고아 포인트(노션에서 삭제된 레코드)를 정리.
 * - 증분 모드: Qdrant max(last_edited_time) 이후 변경분만 upsert. 삭제(고아) 감지는 비범위.
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
  SOURCES,
  type SourceConfig,
} from './sources'
import { loadRecords, loadRecordsSince, loadPage } from './notion'
import { chunkText } from './chunking'
import { embed } from './ollama'
import {
  ensureAllCollections,
  upsertPoints,
  PartialUpsertError,
  pointId,
  deleteStaleChunks,
  deleteOrphanPoints,
  getMaxLastEditedTime,
} from './qdrant'
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

export type IngestMode = 'full' | 'incremental'

/** 단일 소스 인제스트 실행. mode=incremental 이면 sinceDate 를 Qdrant 에서 유도. */
export async function runIngest(
  cfg: SourceConfig,
  producer: Producer,
  onLog: (line: string) => void = () => {},
  opts: { mode?: IngestMode } = {},
): Promise<IngestSummary> {
  const mode = opts.mode ?? 'full'
  const start = Date.now()
  const logs: string[] = []
  const log = (line: string): void => {
    logs.push(line)
    onLog(line)
  }

  // 컬렉션 보장은 차원 불일치 시 삭제→재생성(자가치유)이라 기존 벡터가 전량 소실될 수 있다.
  // 파괴적 재생성을 조용히 넘기지 말고 반드시 경고로 노출한다(관측성).
  const { recreated } = await ensureAllCollections()
  if (recreated.length > 0) {
    log(`  ⚠️ 컬렉션 재생성(기존 벡터 삭제됨): ${recreated.join(', ')}`)
  }
  log(`${cfg.label} 인제스트 시작${mode === 'incremental' ? ' (증분)' : ''}...`)

  // 1) 노션 조회
  let records: NotionRecord[]
  if (mode === 'incremental') {
    const since = await getMaxLastEditedTime(cfg.collection, cfg.source)
    if (!since) {
      log(`포인트 0 — 전체 인제스트 폴백`)
      return runIngest(cfg, producer, onLog, { mode: 'full' })
    }
    log(`증분 since=${since} (Qdrant max last_edited_time)`)
    const notionId = resolveNotionId(cfg)
    if (cfg.kind === 'page') {
      const page = await loadPage(notionId)
      // 날짜 문자열 비교(YYYY-MM-DD) — on_or_after 와 동일하게 >= since 만 포함.
      records = page.lastEditedTime >= since ? [page] : []
    } else {
      records = await loadRecordsSince(notionId, since)
    }
  } else {
    const notionId = resolveNotionId(cfg)
    records = cfg.kind === 'page' ? [await loadPage(notionId)] : await loadRecords(notionId)
  }
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
  // 완전 실패(1청크도 저장 못 함) 레코드만 미러 정리에서 제외 → 마지막 성공 상태 보존(부분 실패 격리).
  const failedRecordIds = new Set<string>()

  for (const group of byRecord.values()) {
    const title = group[0]?.record.title ?? '(unknown)'
    const recordId = group[0]?.record.id ?? ''
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
      // 배치 upsert 는 부분 성공 가능(앞 64개 배치는 커밋 후 뒤 배치가 throw). 실제 저장분을
      // 그대로 가산하고 손실 청크는 그 차이로만 잡는다 — "그룹 전량 미저장" 가정이 오보의 원인이었다.
      const savedInGroup = e instanceof PartialUpsertError ? e.upserted : 0
      upserted += savedInGroup
      const lost = groupChunks - savedInGroup
      // 완전 실패(0 저장)만 stale 정리에서 제외해 마지막 성공 상태를 보존한다.
      // 부분 저장은 이미 새 버전 청크가 미러에 섞여 들어갔으므로, 정리를 수행해
      // 새 total 초과 옛 꼬리를 걷어내야 혼합 상태(신·구 버전 공존)를 최소화한다.
      if (savedInGroup === 0) failedRecordIds.add(recordId)
      const message = e instanceof Error ? e.message : String(e)
      errors.push({ page: title, message, chunksLost: lost })
      log(
        `  ⚠️ 실패: ${title} — ${message} (${lost}청크 손실` +
          (savedInGroup ? `, ${savedInGroup}청크 부분 저장` : '') +
          `)`,
      )
    }
  }

  // 4) SoT 미러 정리
  //    a) 청크 수 축소: 잔존 꼬리 삭제(성공 레코드만) — 전체·증분 공통
  //    b) 고아 포인트 삭제 — 전체 모드만(증분은 삭제 감지 비범위; 부분 조회 keep 목록이 불완전)
  try {
    const totals = new Map<string, number>()
    for (const s of subs) totals.set(s.record.id, s.total)
    for (const record of records) {
      if (failedRecordIds.has(record.id)) continue
      await deleteStaleChunks(cfg.collection, record.id, totals.get(record.id) ?? 0)
    }
    if (mode === 'full') {
      if (records.length > 0) {
        await deleteOrphanPoints(
          cfg.collection,
          cfg.source,
          records.map((r) => r.id),
        )
        log(`미러 정리: 잔존 청크·고아 포인트 삭제 완료`)
      } else {
        log(`미러 정리: 조회 0건 — 고아 포인트 삭제 건너뜀(일시 장애 방지)`)
      }
    } else if (records.length > 0) {
      log(`미러 정리: 잔존 청크 삭제 완료(증분 — 고아 감지 생략)`)
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    log(`  ⚠️ 미러 정리 실패(신규 저장분은 유지됨): ${message}`)
  }

  // 청크 손실 규모 = 생성된 총 청크 − 저장 성공 청크(부분 upsert 포함, upserted 가 실저장분).
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

/** 단일 소스 증분 인제스트(Qdrant max last_edited_time 기준). */
export async function runIncrementalIngest(
  cfg: SourceConfig,
  producer: Producer,
  onLog: (line: string) => void = () => {},
): Promise<IngestSummary> {
  return runIngest(cfg, producer, onLog, { mode: 'incremental' })
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

/** 전 소스 증분 인제스트(순차). */
export async function ingestAllIncremental(
  onLog?: (line: string) => void,
): Promise<IngestSummary[]> {
  const results: IngestSummary[] = []
  for (const cfg of SOURCES) {
    try {
      results.push(await runIncrementalIngest(cfg, getProducer(cfg), onLog))
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
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
        logs: [`${cfg.label} 증분 실패: ${message}`],
      })
    }
  }
  return results
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
