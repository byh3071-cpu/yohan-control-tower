import type { StatusResponse } from '@/lib/vector/types'
import { COLLECTIONS } from '@/lib/vector/collections'

function Badge({
  ok,
  label,
  detail,
  stale,
}: {
  ok: boolean
  label: string
  detail?: string
  stale?: boolean
}) {
  // 스테일이면 현재 상태를 알 수 없으므로 녹색/적색 대신 중립(⚪)으로 흐리게 표시.
  const icon = stale ? '⚪' : ok ? '🟢' : '🔴'
  return (
    <span className={`inline-flex items-center gap-1 text-xs${stale ? ' opacity-50' : ''}`}>
      <span>{icon}</span>
      <span className="text-zinc-300">{label}</span>
      {detail ? <span className="text-zinc-600">{detail}</span> : null}
    </span>
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
  const max = counts ? Math.max(1, ...Object.values(counts)) : 1
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
      {stale ? (
        <div className="mb-3 rounded border border-amber-800 bg-amber-950/40 px-3 py-2 text-xs text-amber-300">
          ⚠️ 상태 갱신 실패 — 아래 값은{updatedAt ? ` 마지막 성공(${updatedAt})` : ' 마지막 성공'} 시점
          기준이며 현재 인프라 상태를 반영하지 않을 수 있습니다.
        </div>
      ) : null}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Badge
          ok={Boolean(status?.qdrant.connected)}
          label="Qdrant"
          detail={status?.qdrant.version ? `v${status.qdrant.version}` : status?.qdrant.error}
          stale={stale}
        />
        <Badge
          ok={Boolean(status?.ollama.available)}
          label="Ollama"
          detail={status?.ollama.available ? status?.ollama.model : status?.ollama.error}
          stale={stale}
        />
        <Badge
          ok={Boolean(status?.notion.configured)}
          label="Notion"
          detail={status?.notion.configured ? 'token 설정됨' : 'NOTION_TOKEN 필요'}
          stale={stale}
        />
      </div>
      <div className="space-y-2">
        {COLLECTIONS.map((c) => {
          const n = counts?.[c.name] ?? 0
          const pct = Math.round((n / max) * 100)
          return (
            <div key={c.name} className="flex items-center gap-3" title={c.purpose}>
              <div className="w-44 shrink-0 truncate text-xs text-zinc-300">{c.name}</div>
              <div className="h-3 flex-1 overflow-hidden rounded bg-zinc-800">
                <div className="h-full bg-emerald-600/70" style={{ width: `${pct}%` }} />
              </div>
              <div className="w-16 shrink-0 text-right text-xs tabular-nums text-zinc-200">{n}건</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
