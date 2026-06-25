import type { StatusResponse } from '@/lib/types'
import { COLLECTIONS } from '@/lib/collections'

function Badge({ ok, label, detail }: { ok: boolean; label: string; detail?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span>{ok ? '🟢' : '🔴'}</span>
      <span className="text-zinc-300">{label}</span>
      {detail ? <span className="text-zinc-600">{detail}</span> : null}
    </span>
  )
}

export default function CollectionStatus({ status }: { status: StatusResponse | null }) {
  const counts = status?.collections
  const max = counts ? Math.max(1, ...Object.values(counts)) : 1
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        <Badge
          ok={Boolean(status?.qdrant.connected)}
          label="Qdrant"
          detail={status?.qdrant.version ? `v${status.qdrant.version}` : status?.qdrant.error}
        />
        <Badge
          ok={Boolean(status?.ollama.available)}
          label="Ollama"
          detail={status?.ollama.available ? status?.ollama.model : status?.ollama.error}
        />
        <Badge
          ok={Boolean(status?.notion.configured)}
          label="Notion"
          detail={status?.notion.configured ? 'token 설정됨' : 'NOTION_TOKEN 필요'}
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
