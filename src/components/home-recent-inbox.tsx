"use client"

import { Loader2 } from "lucide-react"

import { INBOX_STATUS_LABEL, inboxItemTitle, inboxSourceLabel } from "@/lib/home-inbox"
import type { InboxItem } from "@/lib/types"
import { cn } from "@/lib/utils"

interface HomeRecentInboxProps {
  items: InboxItem[]
  selectedId: string | null
  loading: boolean
  error: string | null
  onSelect: (id: string) => void
}

export function HomeRecentInbox({ items, selectedId, loading, error, onSelect }: HomeRecentInboxProps) {
  return (
    <section aria-labelledby="home-recent-heading" className="flex min-h-0 flex-1 flex-col">
      <div className="mb-3">
        <h2 id="home-recent-heading" className="text-lg font-semibold tracking-tight">최근 담은 항목</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          실제 인박스 원장을 갱신 시각 기준으로 정렬합니다.
        </p>
      </div>

      {loading && (
        <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden />
          최근 항목을 불러오는 중
        </div>
      )}

      {!loading && error && (
        <p role="alert" className="rounded-lg border border-amber-300/70 bg-amber-50/70 px-3 py-3 text-sm leading-6 text-amber-900 dark:bg-amber-950/20 dark:text-amber-200">
          {error}
        </p>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm leading-6 text-muted-foreground">
          아직 활성 항목이 없습니다. 위에서 먼저 담으세요.
        </p>
      )}

      {!loading && items.length > 0 && (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((entry) => {
            const selected = entry.id === selectedId
            const source = inboxSourceLabel(entry)
            const status = INBOX_STATUS_LABEL[entry.status]
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onSelect(entry.id)}
                  aria-pressed={selected}
                  className={cn(
                    "flex min-h-14 w-full items-start gap-3 px-3 py-3 text-left focus-visible:ring-2 focus-visible:ring-ring sm:px-4",
                    selected ? "bg-muted" : "hover:bg-muted/60"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-medium leading-7">{inboxItemTitle(entry)}</span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {[source, status].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
