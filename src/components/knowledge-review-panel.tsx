"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  SquarePlay,
} from "lucide-react"

import type {
  KnowledgeReviewClaim,
  KnowledgeReviewClaimType,
  KnowledgeReviewDecision,
  KnowledgeReviewDecisionOutcome,
  KnowledgeReviewDecisionReceipt,
  KnowledgeReviewItem,
} from "@/lib/types"
import { classifyApprovalFlow, classifyReviewQueue } from "@/lib/approval-flow"
import { cn } from "@/lib/utils"

const REVIEW_NOTE_MAX_CHARS = 4_000
const DECISIONS: Array<{ value: KnowledgeReviewDecision; label: string }> = [
  { value: "approve", label: "승인" },
  { value: "approve_after_edit", label: "메모와 함께 승인" },
  { value: "hold", label: "보류" },
  { value: "reject", label: "거절" },
]
const DECISION_LABELS: Record<KnowledgeReviewDecision, string> = {
  approve: "승인",
  approve_after_edit: "메모와 함께 승인",
  hold: "보류",
  reject: "거절",
  reprocess_required: "재처리 필요로 전환",
}
const CLAIM_TYPE_LABELS: Record<KnowledgeReviewClaimType, string> = {
  fact: "사실",
  interpretation: "해석",
  recommendation: "적용 제안",
}

const DECISION_OUTCOMES = new Set<KnowledgeReviewDecisionOutcome>([
  "approved",
  "held",
  "rejected",
  "reprocess_required",
])

type Props = {
  onApproved?: (itemId: string) => Promise<string | null>
  onOpenDoc?: (relPath: string) => void
  recentApproved?: {
    title: string
    summaryRelPath: string | null
    artifacts: KnowledgeReviewDecisionReceipt["artifacts"]
  } | null
}

type ApprovalFlowState = {
  itemId: string
  title: string
  artifacts: KnowledgeReviewDecisionReceipt["artifacts"]
  summaryRelPath: string | null
  nextItemId: string | null
  queueResolved: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseDecisionReceipt(value: unknown, expectedDecision: KnowledgeReviewDecision): KnowledgeReviewDecisionReceipt {
  if (!isRecord(value) || value.ok !== true || !isRecord(value.receipt)) {
    throw new Error("결정 영수증을 확인하지 못했습니다.")
  }
  const receipt = value.receipt
  if (receipt.decision !== expectedDecision || typeof receipt.outcome !== "string" || !DECISION_OUTCOMES.has(receipt.outcome as KnowledgeReviewDecisionOutcome)) {
    throw new Error("결정 영수증의 상태가 요청과 일치하지 않습니다.")
  }
  if (!isRecord(receipt.artifacts) || typeof receipt.artifacts.resource !== "boolean" || typeof receipt.artifacts.summary !== "boolean") {
    throw new Error("결정 영수증의 문서 상태를 확인하지 못했습니다.")
  }
  return {
    decision: expectedDecision,
    outcome: receipt.outcome as KnowledgeReviewDecisionOutcome,
    artifacts: {
      resource: receipt.artifacts.resource,
      summary: receipt.artifacts.summary,
    },
  }
}

function sourceLabel(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname === "youtu.be" || hostname.endsWith("youtube.com")) return "YouTube"
    return hostname.replace(/^www\./, "")
  } catch {
    return "원본"
  }
}

function SourceIcon({ url }: { url: string }) {
  return sourceLabel(url) === "YouTube"
    ? <SquarePlay size={18} aria-hidden />
    : <FileText size={18} aria-hidden />
}

function claimStatus(claim: KnowledgeReviewClaim): { label: string; verified: boolean } {
  const verified = claim.type === "fact"
    && claim.citationVerified
    && Boolean(claim.timestamp && claim.evidenceQuote)
  if (verified) return { label: (claim.timestamp ?? "") + " · 원문 확인", verified: true }
  if (claim.type === "fact") return { label: "근거 확인 필요", verified: false }
  return { label: claim.requiresCrosscheck ? "검토자 판단 · 교차 검증" : "검토자 판단", verified: false }
}

function ApprovalArtifactFlow({ artifacts }: { artifacts: KnowledgeReviewDecisionReceipt["artifacts"] }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch" aria-label="Focus Feed 승인 후 문서 생성 흐름">
      <div className="flex min-h-16 flex-1 items-start gap-3 px-1 py-2">
        <FileText size={18} className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <p className="text-sm font-semibold">Focus Feed</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">검토 원본</p>
        </div>
      </div>
      <span className="flex items-center justify-center text-muted-foreground" aria-hidden>
        <ArrowDown size={16} className="sm:hidden" />
        <ArrowRight size={16} className="hidden sm:block" />
      </span>
      <div className="flex min-h-16 flex-1 items-start gap-3 px-1 py-2">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
        <div>
          <p className="text-sm font-semibold">사람 승인</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">최종 판단 기록</p>
        </div>
      </div>
      <span className="flex items-center justify-center text-muted-foreground" aria-hidden>
        <ArrowDown size={16} className="sm:hidden" />
        <ArrowRight size={16} className="hidden sm:block" />
      </span>
      <div className="flex min-h-16 flex-1 items-start gap-3 px-1 py-2">
        {artifacts.resource
          ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
          : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />}
        <div>
          <p className="text-sm font-semibold">RESOURCE</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{artifacts.resource ? "생성 확인" : "확인 필요"}</p>
        </div>
      </div>
      <span className="flex items-center justify-center text-muted-foreground" aria-hidden>
        <ArrowDown size={16} className="sm:hidden" />
        <ArrowRight size={16} className="hidden sm:block" />
      </span>
      <div className="flex min-h-16 flex-1 items-start gap-3 px-1 py-2">
        {artifacts.summary
          ? <BookOpenCheck size={18} className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
          : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />}
        <div>
          <p className="text-sm font-semibold">SUMMARY</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{artifacts.summary ? "생성 확인" : "확인 필요"}</p>
        </div>
      </div>
    </div>
  )
}

export function KnowledgeReviewPanel({ onApproved, onOpenDoc, recentApproved }: Props) {
  const [items, setItems] = useState<KnowledgeReviewItem[] | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [pending, setPending] = useState<string | null>(null)
  const [pendingDecision, setPendingDecision] = useState<KnowledgeReviewDecision | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [approvalFlow, setApprovalFlow] = useState<ApprovalFlowState | null>(null)
  const [approvalLookupPending, setApprovalLookupPending] = useState(false)
  const [approvalQueuePending, setApprovalQueuePending] = useState(false)
  const approvalFlowHeadingRef = useRef<HTMLHeadingElement>(null)

  const refresh = useCallback(async (): Promise<KnowledgeReviewItem[] | null> => {
    setError(null)
    try {
      const response = await fetch("/api/knowledge-review", { cache: "no-store" })
      const raw = await response.text()
      const value: unknown = raw ? JSON.parse(raw) : {}
      if (!response.ok || !isRecord(value) || !Array.isArray(value.items)) {
        throw new Error(isRecord(value) && typeof value.error === "string" ? value.error : "검토 항목을 불러오지 못했습니다.")
      }
      const nextItems = value.items as KnowledgeReviewItem[]
      setItems(nextItems)
      return nextItems
    } catch (refreshError) {
      setItems(null)
      setError(refreshError instanceof Error ? refreshError.message : "검토 항목을 불러오지 못했습니다.")
      return null
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    if (!approvalFlow) return
    const frame = window.requestAnimationFrame(() => approvalFlowHeadingRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [approvalFlow])

  const decide = async (item: KnowledgeReviewItem, decision: KnowledgeReviewDecision) => {
    if (pending) return
    setPending(item.id)
    setPendingDecision(decision)
    setError(null)
    setMessage(null)
    try {
      const note = notes[item.id]?.trim()
      const response = await fetch("/api/knowledge-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, decision, ...(note ? { note } : {}) }),
      })
      const raw = await response.text()
      const value: unknown = raw ? JSON.parse(raw) : {}
      if (response.status === 409) {
        setMessage("이미 처리된 항목입니다. 최신 상태를 다시 불러왔습니다.")
      } else if (!response.ok) {
        throw new Error(isRecord(value) && typeof value.error === "string" ? value.error : "결정을 저장하지 못했습니다.")
      } else {
        const receipt = parseDecisionReceipt(value, decision)
        const approved = receipt.outcome === "approved"
        if (approved) {
          const nextItems = await refresh()
          let summaryRelPath: string | null = null
          if (receipt.artifacts.summary && onApproved) {
            try {
              summaryRelPath = await onApproved(item.id)
              if (!summaryRelPath) {
                setError("승인은 완료됐지만 문서 목록에서 인사이트를 찾지 못했습니다. 문서 목록을 다시 확인해 주세요.")
              }
            } catch {
              setError("승인은 완료됐지만 문서 목록을 갱신하지 못했습니다. 새로고침 후 다시 확인해 주세요.")
            }
          }
          setApprovalFlow({
            itemId: item.id,
            title: item.title,
            artifacts: receipt.artifacts,
            summaryRelPath,
            nextItemId: nextItems?.[0]?.id ?? null,
            queueResolved: nextItems !== null,
          })
          setExpanded(null)
          setMessage(null)
        } else {
          setMessage(DECISION_LABELS[decision] + "했습니다.")
          await refresh()
        }
      }
      if (response.status === 409) await refresh()
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "결정을 저장하지 못했습니다.")
    } finally {
      setPending(null)
      setPendingDecision(null)
    }
  }

  const openNextReview = () => {
    const nextItemId = approvalFlow?.nextItemId
    setApprovalFlow(null)
    if (!nextItemId) return
    setExpanded(nextItemId)
    window.requestAnimationFrame(() => {
      const itemElement = document.getElementById(`knowledge-review-item-${nextItemId}`)
      const itemButton = document.getElementById(`knowledge-review-toggle-${nextItemId}`)
      const scrollContainer = document.getElementById("knowledge-review")
      if (!itemElement || !scrollContainer) return
      itemButton?.focus({ preventScroll: true })
      const nextTop = scrollContainer.scrollTop
        + itemElement.getBoundingClientRect().top
        - scrollContainer.getBoundingClientRect().top
        - 16
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      scrollContainer.scrollTo({ top: Math.max(0, nextTop), behavior: reduceMotion ? "auto" : "smooth" })
    })
  }

  const retryApprovedDocument = async () => {
    if (!approvalFlow || !onApproved || approvalLookupPending) return
    setApprovalLookupPending(true)
    setError(null)
    try {
      const summaryRelPath = await onApproved(approvalFlow.itemId)
      if (!summaryRelPath) {
        setError("문서 목록에서 승인된 인사이트를 아직 찾지 못했습니다. 잠시 뒤 다시 확인해 주세요.")
        return
      }
      setApprovalFlow((current) => current ? { ...current, summaryRelPath } : current)
    } catch {
      setError("문서 목록을 새로 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요.")
    } finally {
      setApprovalLookupPending(false)
    }
  }

  const retryReviewQueue = async () => {
    if (!approvalFlow || approvalQueuePending) return
    setApprovalQueuePending(true)
    const nextItems = await refresh()
    if (nextItems === null) {
      setError("다음 검토 목록을 불러오지 못했습니다. 잠시 뒤 다시 확인해 주세요.")
    } else {
      setApprovalFlow((current) => current
        ? { ...current, nextItemId: nextItems[0]?.id ?? null, queueResolved: true }
        : current)
    }
    setApprovalQueuePending(false)
  }

  const approvalFlowStatus = approvalFlow
    ? classifyApprovalFlow(approvalFlow.artifacts, approvalFlow.summaryRelPath)
    : null
  const approvalArtifactsReady = approvalFlowStatus === "complete" || approvalFlowStatus === "unlinked"
  const approvalLinked = approvalFlowStatus === "complete"
  const reviewQueueStatus = approvalFlow
    ? classifyReviewQueue(approvalFlow.queueResolved, approvalFlow.nextItemId)
    : null

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-background" aria-labelledby="knowledge-review-title">
      <header className="flex items-start gap-4 border-b border-border px-4 py-5 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Focus Feed</p>
          <h2 id="knowledge-review-title" className="mt-2 text-xl font-semibold tracking-[-0.02em]">도착한 자료</h2>
          <p className="mt-2 max-w-[72ch] text-sm leading-6 text-muted-foreground">
            영상의 핵심을 먼저 읽고, 원문 근거를 확인한 뒤 사람 결정을 남깁니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw size={15} aria-hidden /> 새로고침
        </button>
      </header>

      {approvalFlow && (
        <section className="border-b border-border bg-card/65 px-4 py-6 sm:px-6" role="status" aria-live="polite">
          <p className={cn(
            "text-xs font-semibold uppercase tracking-[0.14em]",
            approvalLinked ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200",
          )}>
            {approvalLinked ? "승인 흐름 완료" : "승인 후 확인 필요"}
          </p>
          <h3
            ref={approvalFlowHeadingRef}
            tabIndex={-1}
            className="mt-2 text-xl font-semibold tracking-[-0.02em] focus:outline-none"
          >
            {approvalLinked
              ? "승인된 지식이 준비됐습니다"
              : approvalArtifactsReady
                ? "문서는 생성됐지만 화면 연결을 확인하지 못했습니다"
                : "승인은 기록됐지만 산출물 확인이 필요합니다"}
          </h3>
          <p className="mt-2 max-w-[72ch] text-base font-medium leading-7">{approvalFlow.title}</p>
          <p className="mt-1 max-w-[72ch] text-sm leading-6 text-muted-foreground">
            {approvalLinked
              ? "사람 판단을 기준으로 원본 보관본과 인사이트 문서를 만들고 서로 연결했습니다."
              : approvalArtifactsReady
                ? "RESOURCE와 SUMMARY 생성은 확인했지만 문서 목록에서 인사이트를 찾지 못했습니다."
                : "사람 승인은 기록됐습니다. 확인되지 않은 산출물은 완료로 표시하지 않습니다."}
          </p>

          <div className="mt-5 border-y border-border py-2">
            <ApprovalArtifactFlow artifacts={approvalFlow.artifacts} />
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {approvalLinked && approvalFlow.summaryRelPath && onOpenDoc && (
              <button
                type="button"
                onClick={() => onOpenDoc(approvalFlow.summaryRelPath!)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-foreground px-4 text-sm font-semibold text-background hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <BookOpenCheck size={16} aria-hidden /> 승인된 인사이트 열기
              </button>
            )}
            {approvalLinked && reviewQueueStatus === "next" ? (
              <button
                type="button"
                onClick={openNextReview}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                다음 검토 보기
              </button>
            ) : approvalLinked && reviewQueueStatus === "complete" ? (
              <p className="flex min-h-11 items-center text-sm font-medium text-emerald-700 dark:text-emerald-300">모든 검토를 마쳤습니다.</p>
            ) : approvalLinked && reviewQueueStatus === "unavailable" ? (
              <button
                type="button"
                disabled={approvalQueuePending}
                onClick={() => void retryReviewQueue()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {approvalQueuePending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <RefreshCw size={15} aria-hidden />}
                다음 검토 목록 다시 확인
              </button>
            ) : approvalArtifactsReady && onApproved ? (
              <button
                type="button"
                disabled={approvalLookupPending}
                onClick={() => void retryApprovedDocument()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {approvalLookupPending ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <RefreshCw size={15} aria-hidden />}
                문서 목록 다시 확인
              </button>
            ) : (
              <p className="flex min-h-11 items-center text-sm font-medium text-amber-800 dark:text-amber-200">확인되지 않은 생성 단계가 남아 있습니다.</p>
            )}
          </div>
        </section>
      )}

      {!approvalFlow && recentApproved && onOpenDoc && (
        <section className="border-b border-border bg-card/35 px-4 py-4 sm:px-6" aria-labelledby="recent-approved-title">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-emerald-700 dark:text-emerald-300">
                <BookOpenCheck size={17} aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">최근 승인된 지식</p>
                <h3 id="recent-approved-title" className="mt-1 line-clamp-2 max-w-[72ch] text-base font-semibold leading-6">
                  {recentApproved.title}
                </h3>
              </div>
            </div>
            {recentApproved.artifacts.resource && recentApproved.artifacts.summary && recentApproved.summaryRelPath ? (
              <button
                type="button"
                onClick={() => onOpenDoc(recentApproved.summaryRelPath!)}
                className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
              >
                <BookOpenCheck size={16} aria-hidden /> 인사이트 열기
              </button>
            ) : (
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">산출물 확인 필요</p>
            )}
          </div>
          <div className="mt-3 border-t border-border pt-2">
            <ApprovalArtifactFlow artifacts={recentApproved.artifacts} />
          </div>
        </section>
      )}

      {message && (
        <p className="mx-4 mt-4 flex items-start gap-2 text-sm text-emerald-700 sm:mx-6 dark:text-emerald-300" aria-live="polite">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" aria-hidden />{message}
        </p>
      )}
      {error && (
        <p className="mx-4 mt-4 flex items-start gap-2 text-sm text-amber-800 sm:mx-6 dark:text-amber-200" role="alert">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden />{error}
        </p>
      )}
      {items === null && !error ? (
        <div className="flex justify-center py-12 text-sm text-muted-foreground">
          <Loader2 size={16} className="mr-2 animate-spin" aria-hidden />불러오는 중
        </div>
      ) : null}
      {items?.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={24} aria-hidden />
          <p className="text-sm font-medium">지금 검토할 항목이 없습니다.</p>
        </div>
      ) : null}

      <div className="divide-y divide-border">
        {items?.map((item) => {
          const open = expanded === item.id
          const evidenceReady = item.approvalReady
          const note = notes[item.id]?.trim() ?? ""
          const claimCounts = item.claims.reduce<Record<KnowledgeReviewClaimType, number>>(
            (counts, claim) => ({ ...counts, [claim.type]: counts[claim.type] + 1 }),
            { fact: 0, interpretation: 0, recommendation: 0 },
          )
          const verifiedFactCount = item.claims.reduce(
            (count, claim) => count + (claimStatus(claim).verified ? 1 : 0),
            0,
          )
          const unverifiedFactCount = claimCounts.fact - verifiedFactCount
          const titleId = `knowledge-review-title-${item.id}`
          const statusId = `knowledge-review-status-${item.id}`
          const summaryId = `knowledge-review-summary-${item.id}`

          return (
            <article id={`knowledge-review-item-${item.id}`} key={item.id} className={cn(open && "bg-card/45")}>
              <button
                id={`knowledge-review-toggle-${item.id}`}
                type="button"
                onClick={() => setExpanded(open ? null : item.id)}
                aria-expanded={open}
                aria-labelledby={`${titleId} ${statusId}`}
                aria-describedby={open ? undefined : summaryId}
                className="flex min-h-20 w-full items-start gap-3 px-4 py-4 text-left hover:bg-accent/35 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-6"
              >
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                  <SourceIcon url={item.originalUrl} />
                </span>
                <span className="min-w-0 flex-1">
                  <span id={titleId} className="line-clamp-2 max-w-[72ch] text-base font-semibold leading-6 tracking-[-0.01em]">{item.title}</span>
                  <span id={statusId} className="sr-only">{evidenceReady ? "승인 가능" : "확인 필요"}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    <span>{sourceLabel(item.originalUrl)}</span>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 sm:hidden",
                      evidenceReady ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200",
                    )} aria-hidden>
                      {evidenceReady ? <ShieldCheck size={14} aria-hidden /> : <ShieldAlert size={14} aria-hidden />}
                      {evidenceReady ? "승인 가능" : "확인 필요"}
                    </span>
                  </span>
                  {!open && <span id={summaryId} className="mt-2 line-clamp-2 max-w-[72ch] text-sm leading-6 text-muted-foreground">{item.summary}</span>}
                </span>
                <span className={cn(
                  "mt-1 hidden shrink-0 items-center gap-1.5 text-sm sm:inline-flex",
                  evidenceReady ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-200",
                )} aria-hidden>
                  {evidenceReady ? <ShieldCheck size={15} aria-hidden /> : <ShieldAlert size={15} aria-hidden />}
                  {evidenceReady ? "승인 가능" : "확인 필요"}
                </span>
                <ChevronDown size={17} className={cn("mt-1 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden />
              </button>

              {open && (
                <div className="border-t border-border px-4 pb-5 sm:px-6">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 py-4 text-sm">
                    <a
                      href={item.originalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center gap-2 font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <ExternalLink size={15} aria-hidden /> 원본 영상 열기
                    </a>
                    {item.notebookLmSource && (
                      <details className="text-muted-foreground">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden">출처 정보</summary>
                        <p className="max-w-full break-all border-l border-border pl-3 text-sm leading-relaxed">{item.notebookLmSource}</p>
                      </details>
                    )}
                  </div>

                  <section aria-labelledby={"overview-" + item.id} className="border-t border-border py-6">
                    <h3 id={"overview-" + item.id} className="text-lg font-semibold tracking-[-0.015em]">한눈에 보기</h3>
                    <p className="mt-3 max-w-[72ch] text-base leading-7 text-foreground/90">{item.summary}</p>

                    <h4 className="mt-8 text-sm font-semibold tracking-[0.03em]">핵심 요점</h4>
                    {item.keyPoints.length ? (
                      <ol className="mt-3 grid max-w-[72ch] gap-3">
                        {item.keyPoints.map((point, index) => (
                          <li key={point + "-" + index} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 text-base leading-7">
                            <span className="font-mono text-sm leading-7 text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ol>
                    ) : <p className="mt-2 text-sm text-muted-foreground">추출된 핵심 요점이 없습니다.</p>}
                  </section>

                  <section aria-labelledby={"claims-" + item.id} className="border-t border-border py-6">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 id={"claims-" + item.id} className="text-lg font-semibold tracking-[-0.015em]">주장과 근거</h3>
                      <p className="text-sm text-muted-foreground">
                        {verifiedFactCount > 0 ? `검증된 근거 ${verifiedFactCount}건` : "검증된 근거 없음"}
                        {unverifiedFactCount > 0 ? ` · 근거 확인 필요 ${unverifiedFactCount}` : ""}
                        {claimCounts.interpretation > 0 ? ` · 해석 ${claimCounts.interpretation}` : ""}
                        {claimCounts.recommendation > 0 ? ` · 적용 제안 ${claimCounts.recommendation}` : ""}
                      </p>
                    </div>
                    {item.claims.length ? (
                      <ul className="mt-3 divide-y divide-border border-y border-border">
                        {item.claims.map((claim, index) => {
                          const status = claimStatus(claim)
                          return (
                            <li key={claim.claim + "-" + index} className="grid items-start gap-x-6 gap-y-2 py-5 sm:grid-cols-[9.5rem_minmax(0,1fr)]">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 sm:block">
                                <p className="text-sm font-semibold leading-6">{CLAIM_TYPE_LABELS[claim.type]}</p>
                                <p className={cn(
                                  "flex items-center gap-1.5 whitespace-nowrap text-sm leading-6 sm:mt-1",
                                  status.verified ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground",
                                )}>
                                  {status.verified && <CheckCircle2 size={14} className="shrink-0" aria-hidden />}
                                  {status.label}
                                </p>
                              </div>
                              <div className="max-w-[72ch] min-w-0">
                                <p className="break-words text-base leading-7">{claim.claim}</p>
                                {status.verified && claim.evidenceQuote ? (
                                  <blockquote className="mt-3 break-words border-l-2 border-foreground/20 pl-3 text-sm leading-6 text-muted-foreground">
                                    “{claim.evidenceQuote}”
                                  </blockquote>
                                ) : null}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    ) : <p className="mt-2 text-sm text-muted-foreground">추출된 주장이 없습니다.</p>}
                  </section>

                  {(item.uncertainties.length > 0 || item.qualityWarnings.length > 0) && (
                    <section aria-labelledby={"checks-" + item.id} className="border-t border-border py-6">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-amber-700 dark:text-amber-300" aria-hidden />
                        <h3 id={"checks-" + item.id} className="text-lg font-semibold tracking-[-0.015em]">판단 전에 확인할 점</h3>
                      </div>
                      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">
                        {[...item.uncertainties, ...item.qualityWarnings].map((warning, index) => (
                          <li key={warning + "-" + index}>{warning}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <section aria-labelledby={"decision-" + item.id} className="border-t border-border pt-6">
                    <div className="flex items-start gap-3">
                      {evidenceReady
                        ? <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-700 dark:text-emerald-300" aria-hidden />
                        : <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />}
                      <div>
                        <h3 id={"decision-" + item.id} className="text-lg font-semibold tracking-[-0.015em]">
                          {evidenceReady ? "근거 검증 완료" : "승인 전 보완 필요"}
                        </h3>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          {evidenceReady
                            ? "백엔드 계약을 통과했습니다. 최종 판단과 승인 실행은 검토자가 합니다."
                            : "현재 산출물은 승인 계약을 충족하지 않습니다."}
                        </p>
                        {!evidenceReady && item.approvalBlockers.length > 0 && (
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                            {item.approvalBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                          </ul>
                        )}
                      </div>
                    </div>

                    {!evidenceReady && item.reprocessEligible && (
                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() => void decide(item, "reprocess_required")}
                        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {pending === item.id ? <Loader2 size={15} className="animate-spin" aria-hidden /> : <RotateCcw size={15} aria-hidden />}
                        재처리 필요로 전환
                      </button>
                    )}

                    {!evidenceReady && !item.reprocessEligible && item.reprocessBlockers.length > 0 && (
                      <details className="mt-4 text-sm text-muted-foreground">
                        <summary className="flex min-h-11 cursor-pointer list-none items-center [&::-webkit-details-marker]:hidden">재처리 제한 · 시도 {item.attemptCount}/3</summary>
                        <ul className="list-disc space-y-1 pl-5">
                          {item.reprocessBlockers.map((blocker) => <li key={blocker}>{blocker}</li>)}
                        </ul>
                      </details>
                    )}

                    <label className="mt-6 block">
                      <span className="text-sm font-medium">승인 메모 <span className="font-normal text-muted-foreground">(선택)</span></span>
                      <textarea
                        value={notes[item.id] ?? ""}
                        onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
                        maxLength={REVIEW_NOTE_MAX_CHARS}
                        rows={3}
                        className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm leading-6 outline-none focus:ring-2 focus:ring-ring"
                      />
                    </label>

                    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {DECISIONS.map((entry) => {
                        const approval = entry.value === "approve" || entry.value === "approve_after_edit"
                        const disabled = pending !== null
                          || (approval && !evidenceReady)
                          || (entry.value === "approve_after_edit" && !note)
                        return (
                          <button
                            key={entry.value}
                            type="button"
                            disabled={disabled}
                            onClick={() => void decide(item, entry.value)}
                            className={cn(
                              "min-h-11 rounded-lg border px-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-ring",
                              entry.value === "approve"
                                ? "border-foreground bg-foreground text-background hover:opacity-90"
                                : entry.value === "reject"
                                  ? "border-border text-red-700 hover:bg-red-500/5 dark:text-red-300"
                                  : "border-border hover:bg-accent",
                            )}
                          >
                            {pending === item.id && pendingDecision === entry.value
                              ? <Loader2 size={15} className="mx-auto animate-spin" aria-hidden />
                              : entry.label}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
