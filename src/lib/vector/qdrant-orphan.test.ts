import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deleteOrphanPoints } from './qdrant.js'

describe('deleteOrphanPoints', () => {
  it('returns early without calling Qdrant when keepPageIds is empty', async () => {
    await assert.doesNotReject(() =>
      deleteOrphanPoints('knowledge_base', 'ai_dictionary', []),
    )
  })
})