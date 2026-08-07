import assert from "node:assert/strict"
import test from "node:test"

import { createTtlCache } from "./server-cache"

test("같은 스탬프와 TTL 안에서는 값을 다시 읽지 않는다", async () => {
  let loads = 0
  const cache = createTtlCache<number>({
    ttlMs: 60_000,
    validate: async () => "same",
  })

  const load = async () => ++loads
  assert.equal(await cache.get(load), 1)
  assert.equal(await cache.get(load), 1)
  assert.equal(loads, 1)
})

test("TTL 안이어도 외부 스탬프가 바뀌면 다시 읽는다", async () => {
  let stamp = "v1"
  let loads = 0
  const cache = createTtlCache<number>({
    ttlMs: 60_000,
    validate: async () => stamp,
  })

  const load = async () => ++loads
  assert.equal(await cache.get(load), 1)
  stamp = "v2"
  assert.equal(await cache.get(load), 2)
  assert.equal(loads, 2)
})

test("같은 스탬프의 동시 요청은 하나의 로드를 공유한다", async () => {
  let loads = 0
  const cache = createTtlCache<number>({
    ttlMs: 60_000,
    validate: async () => "same",
  })

  const load = async () => {
    loads += 1
    await new Promise((resolve) => setTimeout(resolve, 5))
    return loads
  }

  const [first, second] = await Promise.all([cache.get(load), cache.get(load)])
  assert.equal(first, 1)
  assert.equal(second, 1)
  assert.equal(loads, 1)
})

test("clear 이후 늦게 끝난 이전 로드가 캐시를 되살리지 않는다", async () => {
  let finish: (value: number) => void = () => {
    throw new Error("첫 로드가 시작되지 않았습니다.")
  }
  const cache = createTtlCache<number>({ ttlMs: 60_000 })
  const first = cache.get(() => new Promise<number>((resolve) => {
    finish = resolve
  }))

  cache.clear()
  finish(1)
  assert.equal(await first, 1)
  assert.equal(await cache.get(async () => 2), 2)
})
