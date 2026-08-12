'use client'
import { Search } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { CollectionName, QueryResponse } from '@/lib/vector/types'
import { ALL_COLLECTIONS } from '@/lib/vector/sources'

interface Props {
  onSearch: (collection: CollectionName, query: string, topK: number) => Promise<void>
  result: QueryResponse | null
  searching: boolean
  disabled?: boolean
  error?: string
}

export default function QueryTester({ onSearch, result, searching, disabled = false, error }: Props) {
  const [collection, setCollection] = useState<CollectionName>('knowledge_base')
  const [query, setQuery] = useState('')
  const [topK, setTopK] = useState(5)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const value = query.trim()
    if (value && !disabled) void onSearch(collection, value, topK)
  }

  const fieldClass = 'min-h-11 rounded-lg border border-border bg-background px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50'

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <form onSubmit={submit} className="grid gap-2 sm:grid-cols-[minmax(9rem,0.8fr)_minmax(14rem,2fr)_5.5rem_auto]">
        <select value={collection} onChange={(event) => setCollection(event.target.value as CollectionName)} disabled={disabled} className={fieldClass}>
          {ALL_COLLECTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="지식에서 찾을 내용을 입력하세요"
          disabled={disabled}
          className={fieldClass}
        />
        <select value={topK} onChange={(event) => setTopK(Number(event.target.value))} disabled={disabled} className={fieldClass}>
          {[3, 5, 10].map((value) => <option key={value} value={value}>상위 {value}</option>)}
        </select>
        <button
          type="submit"
          disabled={disabled || searching || !query.trim()}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-foreground px-4 text-xs font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-40"
        >
          <Search size={14} aria-hidden /> {searching ? '검색 중' : '검색'}
        </button>
      </form>

      {disabled ? <p className="mt-3 text-xs text-muted-foreground">벡터 저장소와 검색 모델이 연결되면 사용할 수 있습니다.</p> : null}
      {error ? <p className="mt-3 text-xs text-destructive">검색하지 못했습니다. 연결 상태를 확인해 주세요.</p> : null}

      {result ? (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          {result.hits.length === 0 && !searching ? <p className="text-xs text-muted-foreground">검색 결과가 없습니다.</p> : null}
          {result.hits.map((hit, index) => (
            <article key={String(hit.id)} className="rounded-lg border border-border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">{index + 1}. {hit.payload.title}</h3>
                <span className="shrink-0 text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-300">{hit.score.toFixed(3)}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {hit.payload.source_db}{hit.payload.category ? ` · ${hit.payload.category}` : ''}{hit.payload.section ? ` · ${hit.payload.section}` : ''}
              </p>
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-foreground/80">{hit.payload.text}</p>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}
