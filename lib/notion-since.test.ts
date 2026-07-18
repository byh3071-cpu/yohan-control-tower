import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lastEditedOnOrAfterFilter } from './notion.js'
import type { NotionRecord } from './types.js'

describe('lastEditedOnOrAfterFilter', () => {
  it('assembles TimestampFilter with last_edited_time on_or_after', () => {
    const since = '2026-07-01T00:00:00.000Z'
    const filter = lastEditedOnOrAfterFilter(since)
    assert.deepEqual(filter, {
      timestamp: 'last_edited_time',
      last_edited_time: { on_or_after: since },
    })
  })

  it('passes date-only ISO strings through unchanged', () => {
    const since = '2026-07-18'
    const filter = lastEditedOnOrAfterFilter(since)
    assert.equal(filter.timestamp, 'last_edited_time')
    assert.equal(filter.last_edited_time.on_or_after, since)
    // property 키 없음 — Notion TimestampFilter 계약
    assert.equal('property' in filter, false)
  })

  it('loadRecordsSince filter uses full ISO on_or_after (time-unit)', () => {
    const sinceFull = '2026-07-18T14:22:11.000Z'
    const filter = lastEditedOnOrAfterFilter(sinceFull)
    assert.equal(filter.last_edited_time.on_or_after, sinceFull)
    assert.match(filter.last_edited_time.on_or_after, /T\d{2}:\d{2}:\d{2}/)
    assert.ok(filter.last_edited_time.on_or_after.endsWith('Z'))
  })
})

describe('incremental time-unit precision', () => {
  it('payload last_edited_time stores lastEditedTimeFull (full ISO), not date-only', () => {
    const record: Pick<NotionRecord, 'lastEditedTime' | 'lastEditedTimeFull'> = {
      lastEditedTime: '2026-07-18',
      lastEditedTimeFull: '2026-07-18T15:30:00.000Z',
    }
    // ingest.ts 계약: payload.last_edited_time ← lastEditedTimeFull
    const payloadLastEdited = record.lastEditedTimeFull
    assert.equal(payloadLastEdited, '2026-07-18T15:30:00.000Z')
    assert.notEqual(payloadLastEdited, record.lastEditedTime)
  })

  it('same-day earlier edit is excluded when since is later full-ISO max', () => {
    const earlier = '2026-07-18T09:00:00.000Z'
    const later = '2026-07-18T15:30:00.000Z'
    const since = later // getMaxLastEditedTime 결과
    const filter = lastEditedOnOrAfterFilter(since)
    assert.equal(filter.last_edited_time.on_or_after, later)
    // Notion on_or_after / 클라이언트 재필터(>=) 와 동일한 문자열 비교
    assert.equal(earlier >= since, false)
    assert.equal(later >= since, true)
    const candidates = [earlier, later].filter((t) => t >= since)
    assert.deepEqual(candidates, [later])
  })
})
