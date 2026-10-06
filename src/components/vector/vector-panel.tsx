'use client'

import Link from 'next/link'
import { Database, Inbox, RefreshCw, Settings2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { StatusResponse, IngestSummary, QueryResponse, CollectionName } from '@/lib/vector/types'
import { PRODUCT_NAME_SHORT } from '@/lib/product'
import { sourcesByTier } from '@/lib/vector/sources'
import CollectionStatus from '@/components/vector/collection-status'
import IngestButton from '@/components/vector/ingest-button'
import LogViewer from '@/components/vector/log-viewer'
import QueryTester from '@/components/vector/query-tester'

function timestamp(): string {
  return new Date().toLocaleTimeString('ko-KR', { hour12: false })
}

const TIERS: Array<{ tier: 1 | 2 | 3; title: string; description: string }> = [
  { tier: 1, title: '기본 지식', description: 'AI 사전과 운영 규칙' },
  { tier: 2, title: '축적 지식', description: '요약, 지식 허브, 인물·키워드' },
  { tier: 3, title: '확장 기록', description: '리소스와 실행 기록' },
]

export function VectorPanel({ onOpenReview }: { onOpenReview?: () => void } = {}) {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [statusStale, setStatusStale] = useState(false)
  const [statusUpdatedAt, setStatusUpdatedAt] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [running, setRunning] = useState<string | null>(null)
  const [queryResult, setQueryResult] = useState<QueryResponse | null>(null)
  const [searching, setSearching] = useState(false)
  const [queryError, setQueryError] = useState<string | undefined>()

  const append = useCallback((line: string) => {
    setLogs((previous) => [...previous, `[${timestamp()}] ${line}`])
  }, [])

  const refreshStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/vector/status', { cache: 'no-store' })
      if (!response.ok) throw new Error(`status ${response.status}`)
      setStatus((await response.json()) as StatusResponse)
      setStatusStale(false)
      setStatusUpdatedAt(timestamp())
    } catch {
      setStatusStale(true)
    }
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => void refreshStatus(), 0)
    const interval = window.setInterval(() => void refreshStatus(), 30_000)
    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
    }
  }, [refreshStatus])

  const runIngest = useCallback(async (slug: string, label: string) => {
    setRunning(slug)
    append(`${label} 동기화 시작`)
    try {
      const response = await fetch(`/api/vector/ingest/${slug}`, { method: 'POST' })
      const data = (await response.json()) as IngestSummary & { error?: string }
      if (data.error) append(`${label} 실패`)
      else (data.logs ?? []).forEach(append)
    } catch {
      append(`${label} 실행 오류`)
    } finally {
      setRunning(null)
      void refreshStatus()
    }
  }, [append, refreshStatus])

  const runAll = useCallback(async () => {
    setRunning('all')
    append('기본 지식 전체 동기화 시작')
    try {
      const response = await fetch('/api/vector/ingest/all', { method: 'POST' })
      const data = (await response.json()) as { results?: IngestSummary[]; error?: string }
      if (data.error) append('전체 동기화 실패')
      else (data.results ?? []).forEach((result) => result.logs.forEach(append))
    } catch {
      append('전체 동기화 실행 오류')
    } finally {
      setRunning(null)
      void refreshStatus()
    }
  }, [append, refreshStatus])

  const runReset = useCallback(async () => {
    if (!window.confirm('모든 벡터를 삭제하고 다시 생성할까요?')) return
    setRunning('reset')
    append('벡터 전체 초기화 시작')
    try {
      const response = await fetch('/api/vector/reset', { method: 'POST' })
      const data = (await response.json()) as { ok?: boolean; error?: string }
      append(data.error ? '전체 초기화 실패' : '전체 초기화 완료')
    } catch {
      append('전체 초기화 실행 오류')
    } finally {
      setRunning(null)
      void refreshStatus()
    }
  }, [append, refreshStatus])

  const search = useCallback(async (collection: CollectionName, query: string, topK: number) => {
    setSearching(true)
    setQueryError(undefined)
    try {
      const response = await fetch('/api/vector/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, query, topK }),
      })
      const data = (await response.json()) as QueryResponse & { error?: string }
      if (!response.ok || data.error) {
        setQueryError('검색 실패')
        setQueryResult(null)
      } else {
        setQueryResult(data)
      }
    } catch {
      setQueryError('검색 실패')
    } finally {
      setSearching(false)
    }
  }, [])

  const busy = running !== null
  const vectorReady = Boolean(status?.qdrant.connected)
  const notionReady = Boolean(status?.notion.configured)
  const searchReady = vectorReady && Boolean(status?.ollama.available)
  const ingestReady = searchReady && notionReady

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Database size={13} aria-hidden /> 선택 기능
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-foreground">벡터 검색</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Qdrant를 사용할 때만 켜는 고급 검색 도구입니다.</p>
        </div>
        {onOpenReview ? (
          <button type="button" onClick={onOpenReview} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-xs font-semibold text-background">
            <Inbox size={15} aria-hidden /> 지식 검토로 이동
          </button>
        ) : (
          <Link href="/" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-xs font-semibold text-background">
            <Inbox size={15} aria-hidden /> {PRODUCT_NAME_SHORT}으로 돌아가기
          </Link>
        )}
      </header>

      <section aria-labelledby="vector-status-heading">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 id="vector-status-heading" className="text-sm font-semibold text-foreground">연결 상태</h2>
          <button type="button" onClick={() => void refreshStatus()} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
            <RefreshCw size={13} aria-hidden /> 다시 확인
          </button>
        </div>
        <CollectionStatus status={status} stale={statusStale} updatedAt={statusUpdatedAt} />
      </section>

      {!status && !statusStale ? <p className="mt-4 text-xs text-muted-foreground">연결 상태를 확인하고 있습니다.</p> : null}

      {status && !vectorReady ? (
        <section className="mt-4 rounded-xl border border-border bg-muted/40 p-5">
          <h2 className="text-sm font-semibold text-foreground">벡터 검색은 현재 꺼져 있습니다</h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Docker와 Qdrant가 없어도 Focus Feed 지식 수집, NotebookLM 처리, 사람 검토와 Brain 적재는 계속 사용할 수 있습니다. 필요할 때만 이 기능을 다시 연결하세요.
          </p>
        </section>
      ) : null}

      {vectorReady ? (
        <div className="mt-6 space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold text-foreground">지식 검색</h2>
            <QueryTester onSearch={search} result={queryResult} searching={searching} disabled={!searchReady} error={queryError} />
          </section>

          <details className="rounded-xl border border-border bg-card">
            <summary className="flex min-h-11 cursor-pointer items-center gap-2 px-4 text-sm font-semibold text-foreground">
              <Settings2 size={15} aria-hidden /> 동기화 관리
              <span className="ml-auto text-[10px] font-normal text-muted-foreground">고급 도구</span>
            </summary>
            <div className="space-y-5 border-t border-border p-4">
              {!notionReady ? <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">Notion을 연결해야 동기화할 수 있습니다.</p> : null}
              {TIERS.map((group) => (
                <section key={group.tier}>
                  <div className="mb-2">
                    <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                    <p className="text-[11px] text-muted-foreground">{group.description}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {sourcesByTier(group.tier).map((source) => (
                      <IngestButton
                        key={source.slug}
                        label={source.label}
                        collection={source.collection}
                        expected={source.expected}
                        running={running === source.slug}
                        disabled={busy || !ingestReady}
                        lastEditedTime={status?.sources?.[source.source] ?? null}
                        onRun={() => void runIngest(source.slug, source.label)}
                      />
                    ))}
                  </div>
                </section>
              ))}
              <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                <button type="button" onClick={() => void runAll()} disabled={busy || !ingestReady} className="min-h-11 rounded-lg bg-foreground px-4 text-xs font-semibold text-background disabled:opacity-40">
                  {running === 'all' ? '동기화 중' : '기본 지식 전체 동기화'}
                </button>
                <button type="button" onClick={() => void runReset()} disabled={busy} className="min-h-11 rounded-lg border border-destructive/40 px-4 text-xs font-semibold text-destructive disabled:opacity-40">
                  전체 초기화
                </button>
              </div>
            </div>
          </details>

          <LogViewer lines={logs} />
        </div>
      ) : null}
    </main>
  )
}
