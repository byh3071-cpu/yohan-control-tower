"use client"

import { useRef } from "react"

import { CalendarView } from "@/components/calendar-view"
import { ProjectView } from "@/components/project-view"
import { TodoView } from "@/components/todo-view"
import { DAILY_SURFACE, DAILY_VISUAL } from "@/lib/daily-visual"
import { cn } from "@/lib/utils"
import type { WorkLocation, WorkSurface } from "@/lib/work-navigation"

const SURFACES: Array<{
  id: WorkSurface
  label: string
  description: string
}> = [
  { id: "todo", label: "할 일", description: "Goal·문서·Calendar task" },
  { id: "calendar", label: "일정", description: "시간과 Calendar 원장" },
  { id: "projects", label: "프로젝트", description: "프로젝트·Goal·정합성" },
]

const TITLES: Record<WorkSurface, { title: string; summary: string }> = {
  todo: { title: "할 일", summary: "서로 다른 원장의 완료 의미를 섞지 않고, 지금 확인할 작업을 한곳에서 봅니다." },
  calendar: { title: "일정", summary: "Calendar 원장에서 시간과 날짜를 관리합니다. 모바일에서는 선택일 agenda를 먼저 봅니다." },
  projects: { title: "프로젝트", summary: "프로젝트에서 Goal과 Completion Check를 읽고, 정합성 제안은 자동 수정 없이 확인합니다." },
}

interface WorkViewProps {
  location: Extract<WorkLocation, { kind: "work" }>
  onLocationChange: (location: Extract<WorkLocation, { kind: "work" }>, replace?: boolean) => void
  onSelectDoc: (relPath: string) => void
}

export function WorkView({ location, onLocationChange, onSelectDoc }: WorkViewProps) {
  const navRefs = useRef<Array<HTMLButtonElement | null>>([])
  const copy = TITLES[location.surface]
  const isDailyCalendar = location.surface === "calendar"

  const changeSurface = (surface: WorkSurface) => {
    if (surface === location.surface) return
    onLocationChange({ kind: "work", surface })
  }

  const handleNavKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "Enter") {
      event.preventDefault()
      changeSurface(SURFACES[index].id)
      return
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
    event.preventDefault()
    const delta = event.key === "ArrowRight" ? 1 : -1
    const next = (index + delta + SURFACES.length) % SURFACES.length
    navRefs.current[next]?.focus()
  }

  return (
    <main
      className={cn("min-h-full", isDailyCalendar ? "overflow-x-hidden" : "work-shell bg-[#e7ecee] text-[#172326]")}
      {...(isDailyCalendar ? { "data-surface": DAILY_SURFACE } : {})}
    >
      <div className="mx-auto w-full max-w-[1176px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        <nav aria-label="작업 형제 보기" className="flex flex-wrap items-end gap-5">
          {SURFACES.map((surface, index) => {
            const active = surface.id === location.surface
            return (
              <button
                key={surface.id}
                ref={(node) => { navRefs.current[index] = node }}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => changeSurface(surface.id)}
                onKeyDown={(event) => handleNavKeyDown(event, index)}
                className="relative min-h-11 min-w-11 px-1 text-sm font-semibold focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset"
                style={{
                  color: active ? DAILY_VISUAL.ink : DAILY_VISUAL.muted,
                  borderBottom: active ? `2px solid ${DAILY_VISUAL.rose}` : "2px solid transparent",
                  paddingBottom: 3,
                }}
              >
                <span>{surface.label}</span>
                <span className="sr-only">{surface.description}</span>
              </button>
            )
          })}
        </nav>

        {!isDailyCalendar && (
          <header className="border-b border-[#b9c5c8] py-7 sm:py-8">
            <p className="font-mono text-sm font-bold tracking-[0.12em] text-[#146c94]">WORK · {location.surface.toUpperCase()}</p>
            <h1 className="mt-2 text-[clamp(1.75rem,4vw,2rem)] font-bold leading-[1.2] tracking-[-0.035em]">{copy.title}</h1>
            <p className="mt-2 max-w-3xl text-base leading-7 text-[#526367]">{copy.summary}</p>
          </header>
        )}

        <div className={isDailyCalendar ? "pt-3" : "pt-5"}>
          {location.surface === "todo" && (
            <TodoView
              onSelectDoc={onSelectDoc}
              selectedItemKey={location.item ?? null}
              onSelectedItemChange={(item, replace) => onLocationChange({ kind: "work", surface: "todo", ...(item ? { item } : {}) }, replace)}
            />
          )}
          {location.surface === "calendar" && (
            <CalendarView
              initialDate={location.date}
              initialMode={location.mode}
              selectedItemId={location.item ?? null}
              onLocationChange={(next, replace) => onLocationChange({ kind: "work", surface: "calendar", ...next }, replace)}
            />
          )}
          {location.surface === "projects" && (
            <ProjectView
              initialMissionId={location.mission ?? null}
              selectedProjectName={location.project ?? null}
              onSelectionChange={(mission, project, replace) => onLocationChange({
                kind: "work",
                surface: "projects",
                ...(mission ? { mission } : {}),
                ...(project ? { project } : {}),
              }, replace)}
            />
          )}
        </div>
      </div>
    </main>
  )
}
