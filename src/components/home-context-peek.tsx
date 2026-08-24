"use client"

import { ArrowRight, Inbox, X } from "lucide-react"
import { useEffect, useRef } from "react"

import { buildHomePeekView } from "@/lib/home-inbox"
import type { InboxItem } from "@/lib/types"

interface HomeContextPeekProps {
  item: InboxItem | null
  pendingId: string | null
  onClose: () => void
  onOpenInbox: () => void
  onOpenKnowledgeReview: () => void
}

export function HomeContextPeek({
  item,
  pendingId,
  onClose,
  onOpenInbox,
  onOpenKnowledgeReview,
}: HomeContextPeekProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  const peek = item ? buildHomePeekView(item) : null

  useEffect(() => {
    if (!item) return
    const frame = window.requestAnimationFrame(() => headingRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [item])

  if (!item && pendingId) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col border-border px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">컨텍스트 피크</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="피크 닫기"
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          방금 담은 항목이 목록에 아직 보이지 않습니다. 자동으로 다른 항목을 고르지 않습니다.
        </p>
      </aside>
    )
  }

  if (!peek) {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col border-border px-4 py-4 sm:px-5">
        <h2 className="text-lg font-semibold tracking-tight">컨텍스트 피크</h2>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          최근 항목을 선택하면 제목, 출처, 요약과 다음 행동만 보여 줍니다.
        </p>
      </aside>
    )
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-semibold tracking-[-0.025em] focus:outline-none sm:text-2xl"
          >
            {peek.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {[peek.source, peek.statusLabel, peek.stageLabel].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="피크 닫기"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
        <div className="max-w-[72ch] space-y-5">
          {peek.excerpt && (
            <section>
              <h3 className="text-lg font-semibold">원문 발췌</h3>
              <p className="mt-2 text-base leading-7">{peek.excerpt}</p>
            </section>
          )}
          {peek.summary && (
            <section>
              <h3 className="text-lg font-semibold">요약</h3>
              <p className="mt-2 text-base leading-7">{peek.summary}</p>
            </section>
          )}
          {peek.keyPoints.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold">핵심점</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-7">
                {peek.keyPoints.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          )}
          {peek.uncertainties.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold">불확실성</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-7">
                {peek.uncertainties.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </section>
          )}
          {peek.sourceUrl && (
            <p className="text-sm leading-6 text-muted-foreground">
              출처 주소는 호스트만 표시합니다. 내부 경로와 해시는 보이지 않습니다.
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col gap-2 border-t border-border p-4 sm:flex-row sm:px-5">
        <button
          type="button"
          onClick={onOpenKnowledgeReview}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-base font-semibold text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
        >
          지식 검토 열기 <ArrowRight size={16} aria-hidden />
        </button>
        <button
          type="button"
          onClick={onOpenInbox}
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 text-base font-medium hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Inbox size={16} aria-hidden /> 수집함으로 이동
        </button>
      </div>
    </aside>
  )
}
