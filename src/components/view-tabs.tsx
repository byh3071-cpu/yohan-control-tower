"use client"

import { Clock, Database, FolderKanban, House, Table2 } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * 탭 SoT — 상한 5(RULES.md §프론트 아키텍처).
 *
 * v1.0 = 4탭. v1.1 에 `home`(미션 롤업) 하나만 더해 5에서 동결한다. 6번째는 만들지 않는다.
 * 확장은 탭 추가가 아니라 **흡수**로 한다 — 실제로 6탭이던 것을 4로 줄였다:
 *   통계 → 기록 안 · 작업실 → 문서(인박스)와 기록(상태카드)으로 분해 · 관계 → 문서의 표시 모드
 */
export type ViewTab = "home" | "projects" | "docs" | "records" | "vector"

const TABS: { id: ViewTab; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "홈", icon: <House size={14} /> },
  { id: "projects", label: "프로젝트", icon: <FolderKanban size={14} /> },
  { id: "docs", label: "문서", icon: <Table2 size={14} /> },
  { id: "records", label: "기록", icon: <Clock size={14} /> },
  { id: "vector", label: "벡터", icon: <Database size={14} /> },
]

interface ViewTabsProps {
  active: ViewTab
  onChange: (tab: ViewTab) => void
}

export function ViewTabs({ active, onChange }: ViewTabsProps) {
  return (
    <div className="flex items-center gap-0.5 px-2 sm:px-4 border-b border-border bg-background/60 overflow-x-auto overflow-y-hidden">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          aria-pressed={active === t.id}
          className={cn(
            "relative flex shrink-0 items-center gap-1.5 px-2.5 sm:px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap",
            active === t.id
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t.icon}
          {t.label}
          {active === t.id && (
            <span className="absolute bottom-0 left-1 right-1 h-0.5 rounded-full bg-foreground" />
          )}
        </button>
      ))}
    </div>
  )
}
