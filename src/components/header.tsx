"use client"

import { Moon, Sun, Command, Search, PanelLeft, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import type { Stats } from "@/lib/types"
import { PRODUCT_NAME_SHORT } from "@/lib/product"

interface HeaderProps {
  onOpenSearch: () => void
  onOpenKnowledgeReview?: () => void
  onOpenMobileNav?: () => void
  stats: Stats
  /** 아직 상태가 지정되지 않은 관리 문서 수. 0이면 표시하지 않는다. */
  gaps?: number
}

export function Header({ onOpenSearch, onOpenKnowledgeReview, onOpenMobileNav, stats, gaps = 0 }: HeaderProps) {
  const { theme, toggle } = useTheme()

  // 헤더 한 줄에 상주하는 지표. 카드 5장을 한 줄로 접었다 — 문서 목록에 세로 공간을 준다.
  // 배치 상태는 뺐다(상시 감시 대상이 아니라 이상할 때만 보면 되는 값).
  const metrics = [
    { label: "문서", value: stats.totalDocs },
    { label: "결정", value: stats.decisions },
    { label: "인제스트", value: stats.ingests },
  ]

  return (
    <header className="h-12 shrink-0 border-b border-border bg-background/80 backdrop-blur-sm flex items-center px-3 sm:px-4 gap-2 sm:gap-3 z-50">
      {onOpenMobileNav && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0 md:hidden"
          aria-label="메뉴 열기"
          onClick={onOpenMobileNav}
        >
          <PanelLeft size={18} />
        </Button>
      )}
      <div className="flex items-center gap-2 mr-2 sm:mr-4 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-foreground flex items-center justify-center shrink-0">
          <span className="text-background font-bold text-sm">Y</span>
        </div>
        <span className="font-semibold text-sm tracking-tight truncate max-w-[5.5rem] min-[400px]:max-w-none">{PRODUCT_NAME_SHORT}</span>
      </div>

      <button
        onClick={onOpenSearch}
        className="flex-1 min-w-0 max-w-md flex items-center gap-2 h-8 px-2 sm:px-3 rounded-lg border border-border bg-muted/50 text-muted-foreground text-sm transition-colors hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <Search size={14} className="shrink-0" />
        <span className="flex-1 text-left">검색…</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          <Command size={10} />K
        </kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <div className="mr-1 hidden items-center gap-4 text-xs md:flex lg:gap-5">
          {metrics.map((m) => (
            <span key={m.label} className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className="text-muted-foreground">{m.label}</span>
              <span className="font-semibold tabular-nums tracking-tight">{m.value}</span>
            </span>
          ))}
          {gaps > 0 && (
            <span
              className={cn(
                "flex items-baseline gap-1.5 whitespace-nowrap",
                "text-amber-600 dark:text-amber-400"
              )}
              title="상태를 지정해야 하는 관리 문서"
            >
              <span>정리 필요</span>
              <span className="font-semibold tabular-nums tracking-tight">{gaps}</span>
            </span>
          )}
        </div>
        {onOpenKnowledgeReview ? (
          <Button
            type="button"
            variant="ghost"
            className="h-11 gap-1.5 px-2 text-xs sm:px-3"
            onClick={onOpenKnowledgeReview}
            aria-label="지식 검토 열기"
            title="Focus Feed에서 담은 지식 검토"
          >
            <Inbox size={16} />
            <span className="hidden min-[430px]:inline">지식 검토</span>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggle}
          aria-label={theme === "dark" ? "라이트 테마로 변경" : "다크 테마로 변경"}
          title={theme === "dark" ? "라이트 테마로 변경" : "다크 테마로 변경"}
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  )
}
