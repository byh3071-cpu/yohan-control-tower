"use client"

import { useEffect, useState } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { X, ExternalLink, Copy, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { DocFull } from "@/lib/types"

interface DocPreviewProps {
  relPath: string | null
  onClose: () => void
  /** 좁은 화면: 미선택 시 패널 숨김, 선택 시 전체 화면 오버레이 */
  fullscreenMobile?: boolean
}

function loadErrorMessage(status: number): string {
  if (status === 404) return "문서를 찾을 수 없습니다"
  if (status >= 500) return "서버 오류로 문서를 불러올 수 없습니다"
  return "문서를 불러오지 못했습니다"
}

function LoadedDocPreview({
  relPath,
  onClose,
  fullscreenMobile,
}: {
  relPath: string
  onClose: () => void
  fullscreenMobile?: boolean
}) {
  const [doc, setDoc] = useState<DocFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const ac = new AbortController()
    const apiPath = relPath.split("/").map(encodeURIComponent).join("/")
    fetch(`/api/docs/${apiPath}`, { cache: "no-store", signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) {
          setErrorMsg(loadErrorMessage(r.status))
          setDoc(null)
          return
        }
        const d = (await r.json()) as DocFull
        if (typeof d.content !== "string") {
          setErrorMsg("문서를 찾을 수 없습니다")
          setDoc(null)
          return
        }
        setDoc(d)
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return
        setErrorMsg("문서를 불러오지 못했습니다")
        setDoc(null)
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false)
      })

    return () => ac.abort()
  }, [relPath])

  const handleCopy = async () => {
    if (!doc) return
    await navigator.clipboard.writeText(doc.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    const shell = fullscreenMobile
      ? "flex flex-1 items-center justify-center max-md:fixed max-md:inset-x-0 max-md:top-12 max-md:bottom-0 max-md:z-[45] max-md:bg-background"
      : "flex flex-1 items-center justify-center"
    return (
      <div className={shell}>
        <div className="animate-pulse text-muted-foreground text-sm">로딩 중…</div>
      </div>
    )
  }

  if (!doc) {
    const shell = fullscreenMobile
      ? "flex flex-1 flex-col items-center justify-center px-4 max-md:fixed max-md:inset-x-0 max-md:top-12 max-md:bottom-0 max-md:z-[45] max-md:bg-background text-muted-foreground text-sm"
      : "flex flex-1 flex-col items-center justify-center text-muted-foreground text-sm"
    return (
      <div className={shell}>
        <p>{errorMsg ?? "문서를 찾을 수 없습니다"}</p>
      </div>
    )
  }

  const sourceUrl = typeof doc.frontmatter?.source_url === "string" ? doc.frontmatter.source_url : null

  return (
    <div
      className={
        fullscreenMobile
          ? "flex flex-1 flex-col border-l border-border bg-background min-h-0 max-md:fixed max-md:inset-x-0 max-md:top-12 max-md:bottom-0 max-md:z-[45] max-md:border-l-0"
          : "flex flex-1 flex-col border-l border-border bg-background min-h-0"
      }
    >
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border shrink-0">
        <h2 className="text-sm font-semibold truncate flex-1">{doc.title}</h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
          </Button>
          {sourceUrl && (
            <a href={sourceUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <ExternalLink size={14} />
              </Button>
            </a>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X size={14} />
          </Button>
        </div>
      </div>

      {doc.tags?.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-border">
          {doc.tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] font-medium h-5 px-2 py-0">
              {t}
            </Badge>
          ))}
          {doc.date && (
            <span className="text-[10px] text-muted-foreground ml-auto self-center">{doc.date}</span>
          )}
        </div>
      )}

      <ScrollArea className="flex-1 min-h-0">
        <article className="prose prose-sm dark:prose-invert max-w-none px-5 py-4 prose-headings:scroll-mt-4 prose-pre:bg-muted prose-pre:text-muted-foreground prose-code:text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {doc.content}
          </ReactMarkdown>
        </article>
      </ScrollArea>
    </div>
  )
}

export function DocPreview({ relPath, onClose, fullscreenMobile }: DocPreviewProps) {
  if (!relPath) {
    if (fullscreenMobile) return null
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm px-4">
        <p className="text-center">문서를 선택하면 여기에 미리보기가 표시됩니다</p>
      </div>
    )
  }

  return (
    <LoadedDocPreview
      key={relPath}
      relPath={relPath}
      onClose={onClose}
      fullscreenMobile={fullscreenMobile}
    />
  )
}
