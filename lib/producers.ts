/**
 * 소스별 생성기(Producer) — NotionRecord[] → IngestUnit[].
 * 각 DB의 실제 스키마에 맞춰 임베딩할 텍스트를 구성하고 메타데이터를 부여한다.
 *
 * Tier 1(ai_dictionary·protocol·rulebook)은 전용 생성기.
 * 나머지는 우선 기본 생성기로 동작하고 Step 7에서 정교화(인물 6섹션·헌법 조·키워드 등).
 */
import type { Producer, IngestUnit } from './ingest'
import type { SourceConfig } from './sources'
import type { NotionRecord, RulePriority } from './types'
import { splitByHeadings } from './chunking'

type UnitPayload = IngestUnit['payload']

/** 비어있지 않은 문단만 빈 줄로 연결. */
function compose(parts: Array<string | undefined>): string {
  return parts.filter((p): p is string => Boolean(p && p.trim())).join('\n\n')
}

/** 우선순위/태그 → system_rules priority. 절대규칙·🔴필수 = high. */
function mapPriority(r: NotionRecord): RulePriority {
  const tags = r.props['태그'] ?? ''
  const pr = r.props['우선순위'] ?? ''
  if (tags.includes('절대규칙')) return 'high'
  if (pr.includes('필수')) return 'high'
  return 'standard'
}

function categoryOf(r: NotionRecord): string | undefined {
  return r.props['카테고리'] || undefined
}

/** 기본 생성기: 제목 + 비어있지 않은 텍스트 프로퍼티 + 본문. 1레코드 = 1단위. */
function defaultUnit(r: NotionRecord, extra: UnitPayload = {}): IngestUnit {
  const propLines = Object.entries(r.props)
    .filter(([, v]) => v && v.trim().length > 0)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')
  const text = compose([`# ${r.title}`, propLines, r.body])
  return { record: r, pieces: [{ text }], payload: { category: categoryOf(r), ...extra } }
}

// ── Tier 1 전용 생성기 ─────────────────────────────────────

/** AI 사전: 제목(영문) + 한 줄 정의 + 본문. */
const aiDictionary: Producer = (records) =>
  records.map((r) => {
    const eng = r.props['영문 표기']
    const head = eng ? `# ${r.title} (${eng})` : `# ${r.title}`
    const text = compose([head, r.props['한 줄 정의'], r.body])
    return { record: r, pieces: [{ text }], payload: { category: categoryOf(r) } }
  })

/** PROTOCOL: 제목 + 트리거 + 본문(단계). rule_type=protocol. */
const protocol: Producer = (records) =>
  records.map((r) => {
    const trigger = r.props['트리거']
    const text = compose([`# ${r.title}`, trigger ? `트리거: ${trigger}` : undefined, r.body])
    return {
      record: r,
      pieces: [{ text }],
      payload: { category: categoryOf(r), priority: mapPriority(r), rule_type: 'protocol' },
    }
  })

/** RULEBOOK: 제목 + 규칙 내용 + 적용 대상 + 본문. 규칙 1개 = 1단위. rule_type=rule. */
const rulebook: Producer = (records) =>
  records.map((r) => {
    const target = r.props['적용 대상']
    const text = compose([
      `# ${r.title}`,
      r.props['규칙 내용'],
      target ? `적용 대상: ${target}` : undefined,
      r.body,
    ])
    return {
      record: r,
      pieces: [{ text }],
      payload: { category: categoryOf(r), priority: mapPriority(r), rule_type: 'rule' },
    }
  })

/** 인물 DB: 프로필(태그라인+직함+소속+전문분야) 헤드 + 본문 6섹션별 청킹. */
const person: Producer = (records) =>
  records.map((r) => {
    const eng = r.props['영문명']
    const head = compose([
      eng ? `# ${r.title} (${eng})` : `# ${r.title}`,
      r.props['태그라인'] ? `태그라인: ${r.props['태그라인']}` : undefined,
      r.props['역할/직함'] ? `역할: ${r.props['역할/직함']}` : undefined,
      r.props['소속'] ? `소속: ${r.props['소속']}` : undefined,
      r.props['전문 분야'] ? `전문 분야: ${r.props['전문 분야']}` : undefined,
      r.props['학력'] ? `학력: ${r.props['학력']}` : undefined,
    ])
    const pieces: IngestUnit['pieces'] = [{ text: head, section: '프로필' }]
    for (const s of splitByHeadings(r.body)) pieces.push({ text: s.text, section: s.section })
    return {
      record: r,
      pieces: pieces.filter((p) => p.text.trim().length > 0),
      payload: { category: r.props['소속'] || undefined },
    }
  })

/** 헌법(뼈대 페이지): 헤딩 섹션별 청킹(조=청크의 합리적 구현). priority=highest. */
const constitution: Producer = (records) =>
  records.map((r) => {
    const sections = splitByHeadings(r.body)
    const pieces: IngestUnit['pieces'] =
      sections.length > 0
        ? sections.map((s) => ({ text: s.text, section: s.section }))
        : [{ text: compose([`# ${r.title}`, r.body]) }]
    return {
      record: r,
      pieces: pieces.filter((p) => p.text.trim().length > 0),
      payload: { priority: 'highest', rule_type: 'constitution' },
    }
  })

// ── 레지스트리 ─────────────────────────────────────────────

const REGISTRY: Partial<Record<SourceConfig['source'], Producer>> = {
  ai_dictionary: aiDictionary,
  protocol,
  rulebook,
  person_db: person,
  constitution,
}

/** cfg → 전용 생성기 또는 기본 생성기. */
export function getProducer(cfg: SourceConfig): Producer {
  const specific = REGISTRY[cfg.source]
  if (specific) return specific
  // 기본: rule_type 보강(system_rules 컬렉션이면 헌법 외 standard 규칙).
  const extra: UnitPayload =
    cfg.collection === 'system_rules'
      ? { rule_type: cfg.source === 'constitution' ? 'constitution' : 'preference' }
      : {}
  return (records) => records.map((r) => defaultUnit(r, extra))
}
