'use client'
import { useEffect, useRef } from 'react'

export default function LogViewer({ lines }: { lines: string[] }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [lines])
  return (
    <div
      ref={ref}
      className="h-64 overflow-y-auto rounded-md border border-zinc-800 bg-black/60 p-3 text-xs leading-relaxed"
    >
      {lines.length === 0 ? (
        <div className="text-zinc-600">로그가 여기 표시됩니다…</div>
      ) : (
        lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap text-zinc-300">
            {l}
          </div>
        ))
      )}
    </div>
  )
}
