'use client'
import { useEffect, useRef } from 'react'

export default function LogViewer({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [lines])

  if (lines.length === 0) return null

  return (
    <details className="rounded-xl border border-border bg-card">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 text-xs font-semibold text-foreground">
        작업 기록 <span className="ml-2 text-muted-foreground">{lines.length}줄</span>
      </summary>
      <div ref={ref} className="max-h-52 overflow-y-auto border-t border-border bg-muted/35 p-3 font-mono text-[11px] leading-relaxed">
        {lines.map((line, index) => (
          <div key={`${index}-${line}`} className="whitespace-pre-wrap text-foreground/80">
            {line}
          </div>
        ))}
      </div>
    </details>
  )
}
