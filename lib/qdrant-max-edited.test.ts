import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { getMaxLastEditedTime, type QdrantScroller } from './qdrant.js'

function mockScroller(
  pages: Array<{
    points: Array<{ payload?: Record<string, unknown> }>
    next_page_offset?: string | number | null
  }>,
): QdrantScroller {
  let call = 0
  return {
    scroll: async () => {
      const page = pages[call] ?? { points: [], next_page_offset: null }
      call += 1
      return {
        points: page.points,
        next_page_offset: page.next_page_offset ?? null,
      } as Awaited<ReturnType<QdrantScroller['scroll']>>
    },
  }
}

describe('getMaxLastEditedTime', () => {
  it('returns null when no points', async () => {
    const client = mockScroller([{ points: [] }])
    const max = await getMaxLastEditedTime('knowledge_base', 'ai_dictionary', client)
    assert.equal(max, null)
  })

  it('returns max last_edited_time across scrolled pages', async () => {
    const client = mockScroller([
      {
        points: [
          { payload: { last_edited_time: '2026-07-10' } },
          { payload: { last_edited_time: '2026-07-12' } },
        ],
        next_page_offset: 'page2',
      },
      {
        points: [
          { payload: { last_edited_time: '2026-07-11' } },
          { payload: { last_edited_time: '2026-07-15' } },
          { payload: {} },
          { payload: { last_edited_time: 123 } },
        ],
        next_page_offset: null,
      },
    ])
    const max = await getMaxLastEditedTime('knowledge_base', 'ai_dictionary', client)
    assert.equal(max, '2026-07-15')
  })

  it('returns full ISO max among same-day timestamps (time-unit)', async () => {
    const client = mockScroller([
      {
        points: [
          { payload: { last_edited_time: '2026-07-18T10:00:00.000Z' } },
          { payload: { last_edited_time: '2026-07-18T15:30:00.000Z' } },
          { payload: { last_edited_time: '2026-07-18T12:00:00.000Z' } },
        ],
        next_page_offset: null,
      },
    ])
    const max = await getMaxLastEditedTime('knowledge_base', 'ai_dictionary', client)
    assert.equal(max, '2026-07-18T15:30:00.000Z')
    assert.match(max!, /T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })

  it('filters by source via scroll filter must source_db', async () => {
    const calls: unknown[] = []
    const client: QdrantScroller = {
      scroll: async (collection, opts) => {
        calls.push({ collection, opts })
        return { points: [], next_page_offset: null } as Awaited<
          ReturnType<QdrantScroller['scroll']>
        >
      },
    }
    await getMaxLastEditedTime('system_rules', 'protocol', client)
    assert.equal(calls.length, 1)
    const first = calls[0] as {
      collection: string
      opts: {
        filter: { must: Array<{ key: string; match: { value: string } }> }
        with_payload: string[]
        with_vector: boolean
      }
    }
    assert.equal(first.collection, 'system_rules')
    assert.deepEqual(first.opts.filter, {
      must: [{ key: 'source_db', match: { value: 'protocol' } }],
    })
    assert.deepEqual(first.opts.with_payload, ['last_edited_time'])
    assert.equal(first.opts.with_vector, false)
  })
})
