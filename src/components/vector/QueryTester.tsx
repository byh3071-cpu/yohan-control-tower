'use client'
import { useState, type FormEvent } from 'react'
import type { CollectionName, QueryResponse } from '@/lib/vector/types'
import { ALL_COLLECTIONS } from '@/lib/vector/sources'

interface Props {
  onSearch: (collection: CollectionName, query: string, topK: number) => Promise<void>
  result: QueryResponse | null
  searching: boolean
  error?: string
}

export default function QueryTester({ onSearch, result, searching, error }: Props) {
  const [collection, setCollection] = useState<CollectionName>('knowledge_base')
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (q) void onSearch(collection, q, topK)
  }

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
      <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
        <select
          value={collection}
          onChange={(e) => setCollection(e.target.value as CollectionName)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
        >
          {ALL_COLLECTIONS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="질문 입력 (예: 온톨로지와 비슷한 개념)"
          className="min-w-[260px] flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-600"
        />
        <select
          value={topK}
          onChange={(e) => setTopK(Number(e.target.value))}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
        >
          {[3, 5, 10].map((k) => (
            <option key={k} value={k}>
              Top {k}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={searching || !query.trim()}
          className="rounded bg-emerald-700 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          {searching ? '검색중…' : '검색'}
        </button>
      </form>

      {error ? <div className="mt-3 text-xs text-red-400">⚠ {error}</div> : null}

      <div className="mt-3 space-y-2">
        {result?.hits.map((h, i) => (
          <div key={String(h.id)} className="rounded border border-zinc-800 bg-black/40 p-2">
            <div className="flex items-center justify-between">
              <div className="text-sm text-zinc-100">
                {i + 1}. {h.payload.title}
              </div>
              <div className="text-xs tabular-nums text-emerald-400">{h.score.toFixed(3)}</div>
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-500">
              [{h.payload.source_db}] {h.payload.category ?? ''}
              {h.payload.section ? ` · ${h.payload.section}` : ''}
            </div>
            <div className="mt-1 line-clamp-3 text-xs text-zinc-400">{h.payload.text}</div>
          </div>
        ))}
        {result && result.hits.length === 0 && !searching ? (
          <div className="text-xs text-zinc-600">결과 없음</div>
        ) : null}
      </div>
    </div>
  )
}
