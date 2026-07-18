import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lastEditedOnOrAfterFilter } from './notion.js'

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
})
