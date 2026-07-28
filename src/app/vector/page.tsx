'use client'
import { useCallback, useEffect, useState } from 'react'
import type { StatusResponse, IngestSummary, QueryResponse, CollectionName } from '@/lib/vector/types'
import { sourcesByTier } from '@/lib/vector/sources'
import CollectionStatus from '@/components/vector/CollectionStatus'
import IngestButton from '@/components/vector/IngestButton'
import LogViewer from '@/components/vector/LogViewer'
import QueryTester from '@/components/vector/QueryTester'

function ts(): string {
  return new Date().toLocaleTimeString('ko-KR', { hour12: false })
}

const TIERS: Array<{ tier: 1 | 2 | 3; title: string }> = [
  { tier: 1, title: '🔄 인제스트 (Tier 1 — 즉시 효과)' },
  { tier: 2, title: '🔄 인제스트 (Tier 2 — 지식 복리)' },
  { tier: 3, title: '🔄 인제스트 (Tier 3 — 확장)' },
]

export default function Dashboard() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [statusStale, setStatusStale] = useState(false)
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null)
  const [searching, setSearching] = useState(false)
  const [queryError, setQueryError] = useState<string | undefined>(undefined)

  const append = useCallback((line: string) => {
    setLogs((prev) => [...prev, `[${ts()}] ${line}`])
  }, [])

  const refreshStatus = useCallback(async () => {
    // 폴링 실패(fetch 거부·5xx)를 삼키지 않고 스테일로 표시한다.
    // 삼키면 백엔드가 죽어도 마지막 녹색 상태가 무기한 남아 죽은 인프라를 정상으로 오판한다.
    try {
      const res = await fetch('/api/vector/status', { cache: 'no-store' })
      if (!res.ok) throw new Error(`status ${res.status}`)
      setStatus((await res.json()) as StatusResponse)
      setStatusStale(false)
      setStatusUpdatedAt(ts())
    } catch {
      setStatusStale(true)
    }
  }, [])

  useEffect(() => {
    // 초기 1회 + 5초 폴링. setState 는 타이머 콜백 안에서만 발생(effect 본문 동기 호출 회피).
    const initial = setTimeout(() => void refreshStatus(), 0)
    const id = setInterval(() => void refreshStatus(), 5000)
    return () => {
      clearTimeout(initial)
      clearInterval(id)
    }
  }, [refreshStatus])

  const runIngest = useCallback(
    async (slug: string, label: string) => {
      setRunning(slug)
      append(`▶ ${label} 인제스트 시작`)
      try {
        const res = await fetch(`/api/vector/ingest/${slug}`, { method: 'POST' })
        const data = (await res.json()) as IngestSummary & { error?: string }
        if (data.error) append(`❌ ${label} 실패: ${data.error}`)
        else (data.logs ?? []).forEach(append)
      } catch (e) {
        append(`❌ ${label} 오류: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setRunning(null)
        void refreshStatus()
      }
    },
    [append, refreshStatus],
  )

  const runAll = useCallback(async () => {
    setRunning('all')
    append('▶ Tier 1 전체 동기화 시작')
    try {
      const res = await fetch('/api/vector/ingest/all', { method: 'POST' })
      const data = (await res.json()) as { results?: IngestSummary[]; error?: string }
      if (data.error) append(`❌ 실패: ${data.error}`)
      else (data.results ?? []).forEach((r) => r.logs.forEach(append))
    } catch (e) {
      append(`❌ 오류: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRunning(null)
      void refreshStatus()
    }
  }, [append, refreshStatus])

  const runReset = useCallback(async () => {
    if (!window.confirm('4개 컬렉션의 모든 벡터를 삭제하고 재생성합니다. 계속할까요?')) return
    setRunning('reset')
    append('🗑 전체 초기화 시작')
    try {
      const res = await fetch('/api/vector/reset', { method: 'POST' })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      append(data.error ? `❌ 초기화 실패: ${data.error}` : '✅ 초기화 완료')
    } catch (e) {
      append(`❌ 오류: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setRunning(null)
      void refreshStatus()
    }
  }, [append, refreshStatus])

  const search = useCallback(async (collection: CollectionName, query: string, topK: number) => {
    setSearching(true)
    setQueryError(undefined)
    try {
      const res = await fetch('/api/vector/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, query, topK }),
      })
      const data = (await res.json()) as QueryResponse & { error?: string }
      if (!res.ok || data.error) {
        setQueryError(data.error ?? '검색 실패')
        setQueryResult(null)
      } else {
        setQueryResult(data)
      }
    } catch (e) {
      setQueryError(e instanceof Error ? e.message : String(e))
    } finally {
      setSearching(false)
    }
  }, [])

  const busy = running !== null

  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-zinc-100">👁️ 요한 관제탑 — 벡터 인프라 대시보드</h1>
        <p className="mt-1 text-xs text-zinc-500">
          미니멀 다크 · localhost:3001 · 노션 SoT → Qdrant 읽기전용 복사본
        </p>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">📊 Qdrant 상태</h2>
        <CollectionStatus status={status} stale={statusStale} updatedAt={statusUpdatedAt} />
      </section>

      {TIERS.map((g) => (
        <section key={g.tier} className="mb-5">
          <h2 className="mb-2 text-sm font-semibold text-zinc-300">{g.title}</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sourcesByTier(g.tier).map((s) => (
              <IngestButton
                key={s.slug}
                label={s.label}
                collection={s.collection}
                expected={s.expected}
                running={running === s.slug}
                disabled={busy}
                lastEditedTime={status?.sources?.[s.source] ?? null}
                onRun={() => void runIngest(s.slug, s.label)}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="mb-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runAll()}
          disabled={busy}
          className="rounded bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {running === 'all' ? '⏳ 동기화중…' : '🔄 전체 동기화 (Tier 1 전부)'}
        </button>
        <button
          type="button"
          onClick={() => void runReset()}
          disabled={busy}
          className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-900/40 disabled:opacity-40"
        >
          🗑 전체 초기화 (주의)
        </button>
      </section>

      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">🔍 검색 테스트</h2>
        <QueryTester onSearch={search} result={queryResult} searching={searching} error={queryError} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-zinc-300">📋 실시간 로그</h2>
        <LogViewer lines={logs} />
      </section>
    </main>
  )
}
