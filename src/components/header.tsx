"use client"

import { Moon, Sun, Command, Search, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTheme } from "@/components/theme-provider"

interface HeaderProps {
  onOpenSearch: () => void
  onOpenMobileNav?: () => void
}

export function Header({ onOpenSearch, onOpenMobileNav }: HeaderProps) {
  const { theme, toggle } = useTheme()

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
        <span className="font-semibold text-sm tracking-tight truncate max-w-[5.5rem] min-[400px]:max-w-none">Yohan OS</span>
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggle}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </Button>
      </div>
    </header>
  )
}
