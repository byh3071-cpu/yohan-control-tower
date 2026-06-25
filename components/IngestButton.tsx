interface Props {
  label: string
  collection: string
  expected: number
  running: boolean
  disabled: boolean
  onRun: () => void
}

const COLLECTION_COLOR: Record<string, string> = {
  knowledge_base: 'text-sky-400',
  system_rules: 'text-amber-400',
  semantic_cache: 'text-fuchsia-400',
  execution_history: 'text-emerald-400',
}

export default function IngestButton({ label, collection, expected, running, disabled, onRun }: Props) {
  return (
    <div className="flex flex-col justify-between rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
      <div>
        <div className="text-sm font-semibold text-zinc-100">{label}</div>
        <div className="mt-0.5 text-[11px] text-zinc-500">{expected}건 예상</div>
        <div className={`mt-0.5 text-[10px] ${COLLECTION_COLOR[collection] ?? 'text-zinc-400'}`}>{collection}</div>
      </div>
      <button
        type="button"
        onClick={onRun}
        disabled={disabled || running}
        className="mt-2 rounded bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-100 transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {running ? '⏳ 진행중...' : '실행'}
      </button>
    </div>
  )
}
