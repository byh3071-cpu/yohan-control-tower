import { Loader2, Play } from 'lucide-react'

interface Props {
  label: string
  collection: string
  expected: number
  running: boolean
  disabled: boolean
  onRun: () => void
  lastEditedTime?: string | null
}

export default function IngestButton({
  label,
  collection,
  expected,
  running,
  disabled,
  onRun,
  lastEditedTime = null,
}: Props) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
      <div>
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">예상 {expected}건 · {collection}</div>
        <div className="mt-1 text-[10px] text-muted-foreground">마지막 동기화 {lastEditedTime ?? '없음'}</div>
      </div>
      <button
        type="button"
        onClick={onRun}
        disabled={disabled || running}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        {running ? <Loader2 size={13} className="animate-spin" aria-hidden /> : <Play size={13} aria-hidden />}
        {running ? '진행 중' : '실행'}
      </button>
    </div>
  )
}
