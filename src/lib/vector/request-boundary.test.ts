import assert from 'node:assert/strict'
import { test } from 'node:test'

import { POST as incremental } from '@/app/api/vector/ingest/incremental/route'
import { POST as query } from '@/app/api/vector/query/route'
import { POST as reset } from '@/app/api/vector/reset/route'
import { GET as status } from '@/app/api/vector/status/route'
import { isLocalReadRequest, isSameOriginRequest } from '@/lib/inbox-controller'
import { ingestHandler, ingestTierHandler } from '@/lib/vector/ingest'

const LOCAL_ORIGIN = 'http://localhost:3001'

function browserPost(path: string, origin: string): Request {
  return new Request(`${LOCAL_ORIGIN}${path}`, {
    method: 'POST',
    headers: { host: 'localhost:3001', origin },
  })
}

test('로컬 요청 경계는 정확한 loopback origin만 허용한다', () => {
  assert.equal(isSameOriginRequest(browserPost('/api/vector/reset', LOCAL_ORIGIN)), true)
  assert.equal(isSameOriginRequest(browserPost('/api/vector/reset', 'http://evil.example')), false)
  assert.equal(isSameOriginRequest(new Request('http://localhost.evil.example/api/vector/reset', {
    headers: { origin: 'http://localhost.evil.example' },
  })), false)
  assert.equal(isSameOriginRequest(new Request(`${LOCAL_ORIGIN}/api/vector/reset`)), false)
  assert.equal(isSameOriginRequest(new Request('http://127.0.0.1:3001/api/vector/reset', {
    headers: {
      host: 'localhost:3001',
      referer: `${LOCAL_ORIGIN}/`,
      'sec-fetch-site': 'same-origin',
    },
  })), true)
  assert.equal(isLocalReadRequest(new Request(`${LOCAL_ORIGIN}/api/vector/status`)), true)
  assert.equal(isLocalReadRequest(new Request(`${LOCAL_ORIGIN}/api/vector/status`, {
    headers: { host: 'evil.example' },
  })), false)
  assert.equal(isLocalReadRequest(new Request(`${LOCAL_ORIGIN}/api/vector/status`, {
    headers: { 'sec-fetch-site': 'cross-site' },
  })), false)
})

test('모든 벡터 실행 route는 외부 origin을 작업 전에 거부한다', async () => {
  const handlers = [
    ingestHandler('ai-dictionary'),
    ingestTierHandler(1),
    incremental,
    query,
    reset,
  ]

  for (const handler of handlers) {
    const response = await handler(browserPost('/api/vector/test', 'http://evil.example'))
    assert.equal(response.status, 403)
  }
})

test('벡터 상태 조회도 외부 host와 cross-site 요청을 거부한다', async () => {
  const foreignHost = await status(new Request('http://evil.example/api/vector/status'))
  const crossSite = await status(new Request(`${LOCAL_ORIGIN}/api/vector/status`, {
    headers: { 'sec-fetch-site': 'cross-site' },
  }))

  assert.equal(foreignHost.status, 403)
  assert.equal(crossSite.status, 403)
})

test('벡터 검색은 JSON 형식과 입력 길이를 작업 전에 제한한다', async () => {
  const headers = { host: 'localhost:3001', origin: LOCAL_ORIGIN }
  const wrongType = await query(new Request(`${LOCAL_ORIGIN}/api/vector/query`, {
    method: 'POST',
    headers,
    body: 'collection=knowledge_base',
  }))
  const tooLong = await query(new Request(`${LOCAL_ORIGIN}/api/vector/query`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ collection: 'knowledge_base', query: 'x'.repeat(4_001) }),
  }))
  const oversizedBody = await query(new Request(`${LOCAL_ORIGIN}/api/vector/query`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({ collection: 'knowledge_base', query: 'x', padding: 'y'.repeat(20_000) }),
  }))

  assert.equal(wrongType.status, 415)
  assert.equal(tooLong.status, 400)
  assert.equal(oversizedBody.status, 413)
})
