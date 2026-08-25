"use client"

import { useEffect, useRef, useState } from "react"

const MODAL_MEDIA = "(max-width: 1023px)"
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

function focusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    .filter((element) => element.getAttribute("aria-hidden") !== "true" && element.getClientRects().length > 0)
}

export function useResponsiveDialog(open: boolean, onClose: () => void) {
  const [isModal, setIsModal] = useState(false)
  const containerRef = useRef<HTMLElement | null>(null)
  const initialFocusRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    const media = window.matchMedia(MODAL_MEDIA)
    const sync = () => setIsModal(media.matches)
    const timer = window.setTimeout(sync, 0)
    media.addEventListener("change", sync)
    return () => {
      window.clearTimeout(timer)
      media.removeEventListener("change", sync)
    }
  }, [])

  useEffect(() => {
    if (!open || !isModal) return
    const container = containerRef.current
    if (!container) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const frame = window.requestAnimationFrame(() => {
      initialFocusRef.current?.focus()
    })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key !== "Tab") return
      const focusable = focusableElements(container)
      if (focusable.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const first = focusable[0]
      const last = focusable.at(-1) ?? first
      if (!container.contains(document.activeElement)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isModal, onClose, open])

  return { containerRef, initialFocusRef, isModal }
}
