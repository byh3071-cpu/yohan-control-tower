import { CircleCheck, CircleDashed, CircleX } from 'lucide-react'
import type { StatusResponse } from '@/lib/vector/types'
import { COLLECTIONS } from '@/lib/vector/collections'

function ServiceStatus({
  ok,
  label,
  readyLabel,
  unavailableLabel,
  stale,
}: {
  ok: boolean
  label: string
  readyLabel: string
  unavailableLabel: string
  stale?: boolean
}) {
  const Icon = stale ? CircleDashed : ok ? CircleCheck : CircleX
  const tone = stale
    ? 'text-muted-foreground'
    : ok
      ? 'text-emerald-700 dark:text-emerald-300'
      : 'text-amber-700 dark:text-amber-300'

  return (
    <div className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2">
      <Icon size={15} className={tone} aria-hidden />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="truncate text-[10px] text-muted-foreground">
          {stale ? '상태 확인 필요' : ok ? readyLabel : unavailableLabel}
        </p>
      </div>
    </div>
  )
}

export default function CollectionStatus({
  status,
  stale = false,
  updatedAt = null,
}: {
  status: StatusResponse | null
  stale?: boolean
  updatedAt?: string | null
}) {
  const counts = status?.collections
  const connected = Boolean(status?.qdrant.connected)
  const max = counts ? Math.max(1, ...Object.values(counts)) : 1

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      {stale ? (
        <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
          마지막 상태를 확인하지 못했습니다{updatedAt ? ` · 마지막 확인 ${updatedAt}` : ''}.
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <ServiceStatus
          ok={connected}
          label="벡터 저장소"
          readyLabel="Qdrant 연결됨"
          unavailableLabel="현재 사용 안 함"
          stale={stale}
        />
        <ServiceStatus
          ok={Boolean(status?.ollama.available)}
          label="검색 모델"
          readyLabel="Ollama 준비됨"
          unavailableLabel="현재 사용 안 함"
          stale={stale}
        />
        <ServiceStatus
          ok={Boolean(status?.notion.configured)}
          label="Notion 동기화"
          readyLabel="연결됨"
          unavailableLabel="연결 안 됨"
          stale={stale}
        />
      </div>

      {connected ? (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          {COLLECTIONS.map((collection) => {
            const count = counts?.[collection.name] ?? 0
            const width = Math.round((count / max) * 100)
            return (
              <div key={collection.name} className="grid grid-cols-[minmax(7.5rem,11rem)_1fr_3rem] items-center gap-3" title={collection.purpose}>
                <div className="truncate text-xs text-muted-foreground">{collection.name}</div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground/70" style={{ width: `${width}%` }} />
                </div>
                <div className="text-right text-xs font-medium tabular-nums text-foreground">{count}건</div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
