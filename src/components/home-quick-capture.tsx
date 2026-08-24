"use client"

import { Loader2, Send } from "lucide-react"
import { useState } from "react"

import { CAPTURE_CONTENT_MAX_CHARS, CAPTURE_NOTE_MAX_CHARS } from "@/lib/inbox-limits"
import { cn } from "@/lib/utils"

interface HomeQuickCaptureProps {
  submitting: boolean
  error: string | null
  onSubmit: (input: { content: string; note?: string }) => Promise<boolean>
}

export function HomeQuickCapture({ submitting, error, onSubmit }: HomeQuickCaptureProps) {
  const [content, setContent] = useState("")
  const [note, setNote] = useState("")

  const submit = async () => {
    const nextContent = content.trim()
    if (!nextContent) return
    const accepted = await onSubmit({
      content: nextContent,
      note: note.trim() || undefined,
    })
    if (!accepted) return
    setContent("")
    setNote("")
  }

  return (
    <form
      className="rounded-xl border border-border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="mb-3">
        <h2 className="text-lg font-semibold tracking-tight">지금 바로 담기</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          메모, URL, 전사 내용을 붙여넣은 뒤 담기만 합니다. 분류·승인은 하지 않습니다.
        </p>
      </div>
      <label className="sr-only" htmlFor="home-quick-capture">빠른 담기 내용</label>
      <textarea
        id="home-quick-capture"
        value={content}
        maxLength={CAPTURE_CONTENT_MAX_CHARS}
        onChange={(event) => setContent(event.target.value)}
        placeholder="메모, URL, 전사 내용을 붙여넣으세요"
        className="min-h-32 w-full resize-y rounded-lg border border-input bg-background px-3 py-3 text-base leading-7 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <label className="sr-only" htmlFor="home-quick-note">선택 메모</label>
      <input
        id="home-quick-note"
        value={note}
        maxLength={CAPTURE_NOTE_MAX_CHARS}
        onChange={(event) => setNote(event.target.value)}
        placeholder="메모 (선택)"
        className="mt-2 min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm tabular-nums text-muted-foreground">
          {content.length.toLocaleString("ko-KR")} / {CAPTURE_CONTENT_MAX_CHARS.toLocaleString("ko-KR")}
        </p>
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className={cn(
            "inline-flex min-h-11 min-w-28 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-base font-semibold text-background",
            "hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          )}
        >
          {submitting ? <Loader2 size={16} className="animate-spin motion-reduce:animate-none" aria-hidden /> : <Send size={16} aria-hidden />}
          담기
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm leading-6 text-amber-800 dark:text-amber-200">{error}</p>
      )}
    </form>
  )
}
