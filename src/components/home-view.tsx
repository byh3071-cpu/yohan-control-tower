"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { CalendarDays, LayoutDashboard } from "lucide-react"

import { CalendarView } from "@/components/calendar-view"
import { HomeContextPeek } from "@/components/home-context-peek"
import { HomeQuickCapture } from "@/components/home-quick-capture"
import { HomeRecentInbox } from "@/components/home-recent-inbox"
import type { ViewTab } from "@/components/view-tabs"
import {
  enqueueInboxCapture,
  fetchInboxItems,
  resolvePeekSelection,
} from "@/lib/home-inbox"
import type { InboxItem } from "@/lib/types"
import { cn } from "@/lib/utils"

interface HomeViewProps {
  dashboardError: string | null
  onNavigate: (tab: ViewTab) => void
  onOpenInbox: () => void
}

export function HomeView({ dashboardError, onNavigate, onOpenInbox }: HomeViewProps) {
  const [homeMode, setHomeMode] = useState<"overview" | "calendar">("overview")
  const [items, setItems] = useState<InboxItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [captureError, setCaptureError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    try {
      const next = await fetchInboxItems()
      setItems(next)
      setListError(null)
    } catch (error: unknown) {
      setListError(error instanceof Error ? error.message : "인박스 상태 조회 실패")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    const timer = window.setTimeout(() => {
      if (!alive) return
      void refresh(true)
    }, 0)
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [refresh])

  const selected = useMemo(() => resolvePeekSelection(items, selectedId), [items, selectedId])
  const pendingId = selectedId && !selected ? selectedId : null

  const handleCapture = useCallback(async (input: { content: string; note?: string }): Promise<boolean> => {
    setSubmitting(true)
    setCaptureError(null)
    try {
      const id = await enqueueInboxCapture(input)
      setSelectedId(id)
      try {
        const next = await fetchInboxItems()
        setItems(next)
        setListError(null)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "인박스 상태 조회 실패"
        setListError(message)
        setCaptureError(`담기는 완료됐지만 목록을 갱신하지 못했습니다. ${message}`)
      }
      return true
    } catch (error: unknown) {
      setCaptureError(error instanceof Error ? error.message : "담기에 실패했습니다.")
      return false
    } finally {
      setSubmitting(false)
    }
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-[-0.025em] sm:text-2xl">
              {homeMode === "overview" ? "공통 작업대" : "일정과 할 일"}
            </h1>
            <p className="mt-1.5 max-w-[72ch] text-base leading-7 text-muted-foreground">
              {homeMode === "overview"
                ? "빠르게 담고, 갱신된 최근 항목을 확인한 뒤, 다음 행동을 고릅니다."
                : "시간이 있는 일정과 완료할 일을 로컬 Calendar에서 관리합니다."}
            </p>
          </div>
          <div
            className="flex w-fit shrink-0 rounded-lg bg-muted p-1"
            aria-label="Home 보기 방식"
          >
            <button
              type="button"
              aria-pressed={homeMode === "overview"}
              onClick={() => setHomeMode("overview")}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring",
                homeMode === "overview" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutDashboard size={16} aria-hidden /> 개요
            </button>
            <button
              type="button"
              aria-pressed={homeMode === "calendar"}
              onClick={() => setHomeMode("calendar")}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-ring",
                homeMode === "calendar" ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarDays size={16} aria-hidden /> 캘린더
            </button>
          </div>
        </div>
        {dashboardError && (
          <p role="status" className="mt-2 text-sm leading-6 text-amber-800 dark:text-amber-200">
            문서 원장 연결을 확인하세요. 담기와 최근 항목은 인박스 API를 따로 읽습니다.
          </p>
        )}
      </header>

      {homeMode === "calendar" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <CalendarView />
        </div>
      ) : (
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.95fr)]">
        <div className={cn("flex min-h-0 flex-col overflow-hidden border-border lg:border-r", (selected || pendingId) && "max-lg:hidden")}>
          <div className="shrink-0 px-4 py-4 sm:px-6">
            <HomeQuickCapture submitting={submitting} error={captureError} onSubmit={handleCapture} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
            <HomeRecentInbox
              items={items}
              selectedId={selectedId}
              loading={loading}
              error={listError}
              onSelect={setSelectedId}
            />
          </div>
        </div>

        <div className={cn("flex h-full min-h-0 w-full overflow-hidden", !selected && !pendingId && "max-lg:hidden")}>
          <HomeContextPeek
            item={selected}
            pendingId={pendingId}
            onClose={() => setSelectedId(null)}
            onOpenInbox={() => onNavigate("docs")}
            onOpenKnowledgeReview={onOpenInbox}
          />
        </div>
      </div>
      )}
    </div>
  )
}
