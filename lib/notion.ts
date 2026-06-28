/**
 * Notion API 클라이언트 (@notionhq/client v5 — 데이터소스 모델).
 *
 * v5 흐름: databases.retrieve({database_id}) → data_sources[0].id
 *          → dataSources.query({data_source_id}) → 페이지들 → blocks.children.list 로 본문.
 * 노션은 SoT(읽기 전용). 여기서는 절대 쓰지 않는다.
 */
import { Client } from '@notionhq/client'
import type { PageObjectResponse, BlockObjectResponse } from '@notionhq/client'
import type { NotionRecord } from './types'

const NOTION_TOKEN = process.env.NOTION_TOKEN

let client: Client | null = null

function getNotion(): Client {
  if (!NOTION_TOKEN) {
    throw new Error('NOTION_TOKEN 미설정 — yohan-control-tower/.env.local 에 추가 필요')
  }
  if (!client) client = new Client({ auth: NOTION_TOKEN })
  return client
}

export function notionConfigured(): boolean {
  return Boolean(NOTION_TOKEN)
}

type RichTextItem = { plain_text: string }
type PageProperty = PageObjectResponse['properties'][string]

function rich(items: RichTextItem[] | undefined): string {
  return (items ?? []).map((t) => t.plain_text).join('')
}

/** 프로퍼티 값 → 표시용 평문. */
function propToString(prop: PageProperty): string {
  switch (prop.type) {
    case 'title':
      return rich(prop.title)
    case 'rich_text':
      return rich(prop.rich_text)
    case 'select':
      return prop.select?.name ?? ''
    case 'status':
      return prop.status?.name ?? ''
    case 'multi_select':
      return prop.multi_select.map((s) => s.name).join(', ')
    case 'url':
      return prop.url ?? ''
    case 'email':
      return prop.email ?? ''
    case 'phone_number':
      return prop.phone_number ?? ''
    case 'number':
      return prop.number?.toString() ?? ''
    case 'date':
      return prop.date?.start ?? ''
    case 'checkbox':
      return prop.checkbox ? 'true' : 'false'
    case 'people':
      return prop.people.map((p) => ('name' in p ? (p.name ?? p.id) : p.id)).join(', ')
    case 'relation':
      // 관계형은 UUID 목록이라 임베딩 텍스트에 노이즈 — 평탄화에서 제외.
      return ''
    case 'created_time':
      return prop.created_time
    case 'last_edited_time':
      return prop.last_edited_time
    default:
      return ''
  }
}

function extractTitle(props: PageObjectResponse['properties']): string {
  for (const key of Object.keys(props)) {
    const p = props[key]
    if (p.type === 'title') {
      const t = rich(p.title)
      if (t) return t
    }
  }
  return '(제목 없음)'
}

/**
 * 블록 콘텐츠 홀더(`block[type]`)에서 rich_text 배열만 런타임 검증해 추출.
 * 노션 블록 union 을 동적 키로 인덱싱하는 자리라 정적 타입이 닿지 않음 →
 * 캐스트로 단언하는 대신 실제 형태(rich_text: {plain_text:string}[])를 확인하고,
 * 아니면 undefined(=빈 텍스트). 잘못된 형태여도 throw 없이 기존처럼 건너뛴다.
 */
function richTextItemsOf(holder: unknown): RichTextItem[] | undefined {
  if (holder === null || typeof holder !== 'object') return undefined
  const rt = (holder as { rich_text?: unknown }).rich_text
  if (!Array.isArray(rt)) return undefined
  for (const item of rt) {
    if (item === null || typeof item !== 'object') return undefined
    if (typeof (item as { plain_text?: unknown }).plain_text !== 'string') return undefined
  }
  return rt as RichTextItem[]
}

/** 블록 1개 → 평문(마크다운 약식). 공통 rich_text 형태를 런타임 검증으로 추출. */
function blockText(block: BlockObjectResponse): string {
  const type = block.type
  // 동적 키 인덱싱(블록 union 의 type 별 콘텐츠 키) — 결과는 가드로 검증.
  const holder = (block as Record<string, unknown>)[type]
  const content = rich(richTextItemsOf(holder))
  if (!content) return ''
  switch (type) {
    case 'heading_1':
      return `# ${content}`
    case 'heading_2':
      return `## ${content}`
    case 'heading_3':
      return `### ${content}`
    case 'bulleted_list_item':
    case 'numbered_list_item':
    case 'to_do':
      return `- ${content}`
    case 'quote':
      return `> ${content}`
    default:
      return content
  }
}

/** 페이지(또는 블록) 본문 텍스트를 재귀적으로 직렬화. */
async function pageBodyText(blockId: string, depth = 0): Promise<string> {
  if (depth > 3) return ''
  const notion = getNotion()
  const lines: string[] = []
  let cursor: string | undefined
  do {
    const res = await notion.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 })
    for (const block of res.results) {
      if (!('type' in block)) continue
      const full = block as BlockObjectResponse
      const text = blockText(full)
      if (text) lines.push(text)
      if (full.has_children) {
        const child = await pageBodyText(full.id, depth + 1)
        if (child) lines.push(child)
      }
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  return lines.join('\n')
}

/**
 * databases.retrieve 응답에서 첫 data source id 를 런타임 검증으로 추출.
 * v5 응답에 data_sources 가 SDK 정적 타입에 없어 캐스트로 단언하던 자리 →
 * data_sources 가 {id:string}[] 형태인지 확인하고 아니면 undefined.
 */
function firstDataSourceId(db: unknown): string | undefined {
  if (db === null || typeof db !== 'object') return undefined
  const sources = (db as { data_sources?: unknown }).data_sources
  if (!Array.isArray(sources) || sources.length === 0) return undefined
  const first = sources[0]
  if (first === null || typeof first !== 'object') return undefined
  const id = (first as { id?: unknown }).id
  return typeof id === 'string' ? id : undefined
}

/** database_id → 첫 번째 data source id (v5). 실패 시 입력값을 그대로 폴백. */
async function resolveDataSourceId(databaseId: string): Promise<string> {
  try {
    const db = await getNotion().databases.retrieve({ database_id: databaseId })
    const id = firstDataSourceId(db)
    if (id) return id
  } catch {
    // 폴백: databaseId 자체가 data source id 일 수 있음
  }
  return databaseId
}

/** Notion ID 정규화(대시 제거된 32자 hex → SDK가 받는 형태로 그대로 전달 가능). */
function normalizeId(id: string): string {
  return id.replace(/-/g, '')
}

/**
 * 데이터베이스의 모든 행을 NotionRecord 로 로드.
 * withBody=true 면 각 페이지 본문 블록까지 직렬화(인제스트 기본값).
 */
export async function loadRecords(
  databaseId: string,
  opts: { withBody?: boolean } = {},
): Promise<NotionRecord[]> {
  const withBody = opts.withBody ?? true
  const notion = getNotion()
  const dataSourceId = await resolveDataSourceId(normalizeId(databaseId))
  const records: NotionRecord[] = []
  let cursor: string | undefined
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      start_cursor: cursor,
      page_size: 100,
    })
    for (const page of res.results) {
      if (!('properties' in page)) continue
      const p = page as PageObjectResponse
      const props: Record<string, string> = {}
      for (const [k, v] of Object.entries(p.properties)) props[k] = propToString(v)
      records.push({
        id: p.id,
        url: p.url,
        title: extractTitle(p.properties),
        createdTime: p.created_time.slice(0, 10),
        lastEditedTime: p.last_edited_time.slice(0, 10),
        props,
        body: withBody ? await pageBodyText(p.id) : '',
      })
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)
  return records
}

/** 단일 페이지(헌법 등 DB 아닌 페이지)를 NotionRecord 로 로드. */
export async function loadPage(pageId: string): Promise<NotionRecord> {
  const notion = getNotion()
  const id = normalizeId(pageId)
  const page = await notion.pages.retrieve({ page_id: id })
  let title = '(제목 없음)'
  let createdTime = ''
  let lastEditedTime = ''
  let url = `https://www.notion.so/${id}`
  if ('properties' in page) {
    const p = page as PageObjectResponse
    title = extractTitle(p.properties)
    createdTime = p.created_time.slice(0, 10)
    lastEditedTime = p.last_edited_time.slice(0, 10)
    url = p.url
  }
  const body = await pageBodyText(id)
  return { id, url, title, createdTime, lastEditedTime, props: {}, body }
}
