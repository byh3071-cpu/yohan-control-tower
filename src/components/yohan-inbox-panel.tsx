"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Inbox,
  Loader2,
  RefreshCw,
  Send,
} from "lucide-react"

import { SotDraftPanel } from "@/components/sot-draft-panel"
import { KnowledgeReviewPanel } from "@/components/knowledge-review-panel"
import { CAPTURE_CONTENT_MAX_CHARS, CAPTURE_NOTE_MAX_CHARS } from "@/lib/inbox-limits"
import type {
  InboxDashboardResponse,
  InboxDisposition,
  InboxItem,
  InboxItemStatus,
  InboxStage,
} from "@/lib/types"
import { cn } from "@/lib/utils"

type Props = {
  onSaved?: () => void
}

type DecisionDraft = {
  disposition: InboxDisposition
  myThoughts: string
  selectedActions: string[]
}

const DISPOSITION_LABEL: Record<InboxDisposition, string> = {
  knowledge: "지식 정본",
  skill: "스킬 후보",
  action: "실행 항목",
  reference: "참고 자료",
  duplicate: "중복",
  reject: "폐기",
  unrecoverable: "원문 복구 불가",
}

const STATUS_LABEL: Record<InboxItemStatus, string> = {
  queued: "대기",
  processing: "정제 중",
  review_required: "판단 필요",
  completed: "완료",
  action_required: "보류/조치",
  failed: "실패",
}

const STAGE_LABEL: Record<InboxStage, string> = {
  captured: "수집됨",
  triaged: "1차 분류",
  deep_analyzed: "깊이 분석",
  decided: "사람 결정",
  promoted: "정본 승격",
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function itemTitle(item: InboxItem): string {
  return item.deep?.title
    ?? item.triage?.source_summary
    ?? item.envelope.user_note
    ?? item.envelope.raw_text?.slice(0, 120)
    ?? item.canonical_url
    ?? item.id
}

function initialDecision(item: InboxItem): DecisionDraft {
  return {
    disposition: item.human?.disposition
      ?? item.deep?.recommended_disposition
      ?? item.triage?.recommended_disposition
      ?? "reference",
    myThoughts: item.human?.my_thoughts ?? "",
    selectedActions: item.human?.selected_actions ?? [],
  }
}

function statusTone(status: InboxItemStatus): string {
  if (status === "failed") return "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-300"
  if (status === "review_required") return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
  if (status === "completed") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  return "border-border bg-muted/50 text-muted-foreground"
}

export function YohanInboxPanel({ onSaved }: Props) {
  const [dashboard, setDashboard] = useState<InboxDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [content, setContent] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const pendingIdsRef = useRef<Set<string>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set())
  const [ack, setAck] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, DecisionDraft>>({})

  const beginItemAction = useCallback((id: string): boolean => {
    if (pendingIdsRef.current.has(id)) return false
    const next = new Set(pendingIdsRef.current)
    next.add(id)
    pendingIdsRef.current = next
    setPendingIds(next)
    return true
  }, [])

  const endItemAction = useCallback((id: string) => {
    const next = new Set(pendingIdsRef.current)
    next.delete(id)
    pendingIdsRef.current = next
    setPendingIds(next)
  }, [])

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/inbox?t=${Date.now()}`, { cache: "no-store" })
      const value = await response.json() as unknown
      if (!response.ok || !isRecord(value) || value.ok !== true) {
        throw new Error(isRecord(value) && typeof value.error === "string" ? value.error : "인박스 상태 조회 실패")
      }
      setDashboard(value as unknown as InboxDashboardResponse)
    } catch (refreshError) {
      setDashboard(null)
      setError(refreshError instanceof Error ? refreshError.message : "인박스 상태 조회 실패")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(true), 0)
    const interval = window.setInterval(() => void refresh(false), 30_000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(interval)
    }
  }, [refresh])

  const visibleItems = dashboard?.items ?? []

  const postAction = useCallback(async (body: Record<string, unknown>) => {
    const response = await fetch("/api/inbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const value = await response.json() as unknown
    if (!response.ok || !isRecord(value) || value.ok !== true) {
      throw new Error(isRecord(value) && typeof value.error === "string" ? value.error : "인박스 작업 실패")
    }
    return value
  }, [])

  const enqueue = async () => {
    if (!content.trim()) {
      setError("링크 또는 텍스트를 입력하세요.")
      return
    }
    setSubmitting(true)
    setError(null)
    setAck(null)
    try {
      const value = await postAction({ action: "enqueue", content, note })
      const item = isRecord(value.item) ? value.item : null
      const id = item && typeof item.id === "string" ? item.id : null
      setAck(id ? `수집 완료 · ${id}` : "수집 완료")
      setContent("")
      setNote("")
      await refresh(false)
    } catch (enqueueError) {
      setError(enqueueError instanceof Error ? enqueueError.message : "수집 실패")
    } finally {
      setSubmitting(false)
    }
  }

  const updateDraft = (item: InboxItem, patch: Partial<DecisionDraft>) => {
    setDrafts((current) => ({
      ...current,
      [item.id]: { ...(current[item.id] ?? initialDecision(item)), ...patch },
    }))
  }

  const saveDecision = async (item: InboxItem, decision: "approve" | "defer") => {
    if (!beginItemAction(item.id)) return
    const draft = drafts[item.id] ?? initialDecision(item)
    setError(null)
    try {
      await postAction({
        action: "decide",
        id: item.id,
        decision,
        ...(decision === "approve" ? { disposition: draft.disposition } : {}),
        myThoughts: draft.myThoughts,
        selectedActions: decision === "approve" ? draft.selectedActions : [],
      })
      setAck(decision === "approve" ? "처리 결정을 저장했습니다. 정본 승격은 별도 승인입니다." : "보류로 이동했습니다.")
      await refresh(false)
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "결정 저장 실패")
    } finally {
      endItemAction(item.id)
    }
  }

  const promote = async (item: InboxItem) => {
    const confirmed = window.confirm("이 항목을 brain 정본으로 승격할까요? 기존 파일은 덮어쓰지 않습니다.")
    if (!confirmed) return
    if (!beginItemAction(item.id)) return
    setError(null)
    try {
      await postAction({ action: "approve", id: item.id })
      setAck("정본 승격을 완료했습니다.")
      onSaved?.()
      await refresh(false)
    } catch (promoteError) {
      setError(promoteError instanceof Error ? promoteError.message : "정본 승격 실패")
    } finally {
      endItemAction(item.id)
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card/40">
      <div className="order-2 grid gap-0 lg:order-1 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <section className="space-y-3 border-b border-border p-4 lg:border-b-0 lg:border-r">
          <div className="flex items-start gap-2">
            <div className="mt-0.5 rounded-lg bg-foreground p-1.5 text-background">
              <Inbox size={15} />
            </div>
            <div>
              <h2 className="text-sm font-semibold">요한 인박스</h2>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                지금은 무손실 수집만. 정제와 정본 승격은 집 PC에서 이어집니다.
              </p>
            </div>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] font-medium">링크 또는 텍스트</span>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={4}
              maxLength={CAPTURE_CONTENT_MAX_CHARS}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-xs leading-relaxed outline-none focus:ring-2 focus:ring-ring"
              placeholder="URL을 붙여넣거나 생각 조각을 그대로 적으세요."
            />
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] font-medium">왜 저장했는지 (선택)</span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={CAPTURE_NOTE_MAX_CHARS}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              placeholder="나중에 판단할 때 필요한 한 줄"
            />
          </label>
          <button
            type="button"
            disabled={submitting}
            onClick={() => void enqueue()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 py-2 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            수집함에 넣기
          </button>

          {ack && (
            <p className="flex items-start gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2 text-[11px] text-emerald-700 dark:text-emerald-300" aria-live="polite">
              <CheckCircle2 size={13} className="mt-0.5 shrink-0" />
              <span className="break-all">{ack}</span>
            </p>
          )}
        </section>

        <section className="min-w-0 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div>
              <h2 className="text-sm font-semibold">처리 큐</h2>
              <p className="text-[10px] text-muted-foreground">활성 건수가 0이면 인박스 제로입니다.</p>
            </div>
            <button
              type="button"
              onClick={() => void refresh(true)}
              disabled={loading}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] text-muted-foreground hover:bg-accent disabled:opacity-50"
            >
              <RefreshCw size={11} className={cn(loading && "animate-spin")} />
              새로고침
            </button>
            <span className="text-[10px] text-muted-foreground">
              완료 {dashboard?.status.completed ?? 0}
            </span>
          </div>

          {dashboard && (
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {[
                ["활성", dashboard.active.total],
                ["판단", dashboard.status.review_required],
                ["보류", dashboard.status.action_required],
                ["실패", dashboard.status.failed],
              ].map(([label, count]) => (
                <div key={String(label)} className="rounded-lg border border-border bg-background/60 px-2 py-1.5 text-center">
                  <p className="text-sm font-semibold tabular-nums">{count}</p>
                  <p className="text-[9px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          )}

          {dashboard && visibleItems.length < dashboard.active.total && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300" role="status">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>
                활성 {dashboard.active.total}건 중 {visibleItems.length}건만 표시 중입니다. 일부를 숨긴 채 0건으로 판정하지 않습니다.
              </span>
            </div>
          )}

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-600 dark:text-red-300" role="alert">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="max-h-[56vh] space-y-2 overflow-y-auto pr-1">
            {loading && !dashboard ? (
              <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> 인박스 읽는 중…
              </div>
            ) : visibleItems.length === 0 && dashboard?.active.total === 0 ? (
              <div className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-500/5 py-10 text-center">
                <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={22} />
                <p className="text-sm font-semibold">활성 인박스 0</p>
                <p className="mt-1 text-[10px] text-muted-foreground">쌓인 자료가 모두 처리됐습니다.</p>
              </div>
            ) : visibleItems.length === 0 && dashboard ? (
              <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 py-8 text-center">
                <AlertTriangle className="mx-auto mb-2 text-amber-500" size={20} />
                <p className="text-sm font-semibold">활성 {dashboard.active.total}건을 목록에서 불러오지 못했습니다.</p>
                <p className="mt-1 text-[10px] text-muted-foreground">0건으로 처리하지 않았습니다. 새로고침하거나 CLI 상태를 확인하세요.</p>
              </div>
            ) : (
              visibleItems.map((item) => {
                const expanded = expandedId === item.id
                const draft = drafts[item.id] ?? initialDecision(item)
                const canDecide = (item.status === "review_required" || item.status === "action_required")
                  && ["triaged", "deep_analyzed", "decided"].includes(item.stage)
                const canPromote = item.status === "review_required"
                  && item.stage === "decided"
                  && item.human?.decision === "approve"
                const working = pendingIds.has(item.id)

                return (
                  <article key={item.id} className="overflow-hidden rounded-lg border border-border bg-background/70">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent/40"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1">
                          <span className={cn("rounded border px-1.5 py-0.5 text-[9px]", statusTone(item.status))}>
                            {STATUS_LABEL[item.status]}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                            {STAGE_LABEL[item.stage]}
                          </span>
                          <span className="text-[9px] uppercase text-muted-foreground">{item.platform}</span>
                        </div>
                        <p className="truncate text-[11px] font-medium">{itemTitle(item)}</p>
                        <p className="mt-0.5 truncate text-[9px] text-muted-foreground">
                          {item.id} · {new Date(item.updated_at).toLocaleString("ko-KR")}
                        </p>
                      </div>
                      <ChevronDown size={13} className={cn("mt-1 shrink-0 transition-transform", expanded && "rotate-180")} />
                    </button>

                    {expanded && (
                      <div className="space-y-3 border-t border-border px-3 py-3">
                        {item.canonical_url && (
                          <a
                            href={item.canonical_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex max-w-full items-center gap-1 text-[10px] text-blue-600 hover:underline dark:text-blue-300"
                          >
                            <ExternalLink size={10} className="shrink-0" />
                            <span className="truncate">원문 열기</span>
                          </a>
                        )}
                        {item.deep ? (
                          <div className="space-y-2 text-[11px] leading-relaxed">
                            <p>{item.deep.summary}</p>
                            <div className="rounded-lg bg-muted/50 px-2.5 py-2">
                              <p className="mb-1 text-[10px] font-medium">요한에게 왜 필요한가</p>
                              <p className="text-[10px] text-muted-foreground">{item.deep.yohan_relevance}</p>
                            </div>
                            {item.deep.uncertainties.length > 0 && (
                              <p className="text-[10px] text-amber-700 dark:text-amber-300">
                                불확실: {item.deep.uncertainties.join(" · ")}
                              </p>
                            )}
                          </div>
                        ) : item.triage ? (
                          <p className="text-[11px] text-muted-foreground">{item.triage.source_summary}</p>
                        ) : (
                          <p className="rounded-lg bg-muted/50 px-2.5 py-2 text-[10px] text-muted-foreground">
                            아직 정제 전입니다. CLI/에이전트가 1차 분류한 뒤 사람 판단 버튼이 열립니다.
                          </p>
                        )}

                        {canDecide && (
                          <div className="space-y-2 rounded-lg border border-border p-2.5">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-[10px] font-medium">처리 방식</span>
                                <select
                                  value={draft.disposition}
                                  onChange={(event) => updateDraft(item, { disposition: event.target.value as InboxDisposition })}
                                  className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-[10px]"
                                >
                                  {Object.entries(DISPOSITION_LABEL).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-[10px] font-medium">내 생각</span>
                                <textarea
                                  value={draft.myThoughts}
                                  onChange={(event) => updateDraft(item, { myThoughts: event.target.value })}
                                  rows={2}
                                  maxLength={CAPTURE_NOTE_MAX_CHARS}
                                  className="w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-[10px]"
                                  placeholder="정본에 함께 보존할 맥락"
                                />
                              </label>
                            </div>

                            {draft.disposition === "action" && item.deep?.actions.length ? (
                              <fieldset className="space-y-1">
                                <legend className="text-[10px] font-medium">실행할 행동 선택</legend>
                                {item.deep.actions.map((candidate) => (
                                  <label key={candidate.id} className="flex items-start gap-1.5 text-[10px] text-muted-foreground">
                                    <input
                                      type="checkbox"
                                      checked={draft.selectedActions.includes(candidate.id)}
                                      onChange={(event) => updateDraft(item, {
                                        selectedActions: event.target.checked
                                          ? [...draft.selectedActions, candidate.id]
                                          : draft.selectedActions.filter((id) => id !== candidate.id),
                                      })}
                                      className="mt-0.5 size-3.5 rounded border-border accent-foreground"
                                    />
                                    <span><strong className="text-foreground">{candidate.title}</strong>{candidate.detail ? ` — ${candidate.detail}` : ""}</span>
                                  </label>
                                ))}
                              </fieldset>
                            ) : null}

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={working}
                                onClick={() => void saveDecision(item, "approve")}
                                className="rounded-md bg-foreground px-2.5 py-1.5 text-[10px] font-medium text-background disabled:opacity-50"
                              >
                                처리 결정 저장
                              </button>
                              <button
                                type="button"
                                disabled={working}
                                onClick={() => void saveDecision(item, "defer")}
                                className="rounded-md border border-border px-2.5 py-1.5 text-[10px] text-muted-foreground hover:bg-accent disabled:opacity-50"
                              >
                                보류
                              </button>
                            </div>
                          </div>
                        )}

                        {canPromote && (
                          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-2">
                            <p className="text-[10px] text-muted-foreground">결정 저장됨 · 아직 정본 파일은 쓰지 않았습니다.</p>
                            <button
                              type="button"
                              disabled={working}
                              onClick={() => void promote(item)}
                              className="shrink-0 rounded-md bg-emerald-600 px-2.5 py-1.5 text-[10px] font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                            >
                              {working ? "승격 중…" : "정본 승격 승인"}
                            </button>
                          </div>
                        )}

                        {item.stage === "promoted" && (
                          <p className="flex items-center gap-1.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 size={12} /> PromotionReceipt.v1 기록 완료
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                )
              })
            )}
          </div>
        </section>
      </div>

      <details className="order-1 border-b border-border bg-background/55 lg:order-2 lg:border-b-0 lg:border-t" open>
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-foreground hover:bg-accent/40">
          <Inbox size={15} aria-hidden />
          <span>지식 검토</span>
          <span className="ml-auto text-[10px] font-normal text-muted-foreground">Focus Feed에서 담은 자료</span>
        </summary>
        <div className="p-4 pt-1">
          <KnowledgeReviewPanel />
        </div>
      </details>

      <details className="order-3 border-t border-border">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 text-[10px] text-muted-foreground hover:bg-accent/30">
          기존 SoT 초안 도구
        </summary>
        <SotDraftPanel onSaved={onSaved} />
      </details>
    </div>
  )
}
