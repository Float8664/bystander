"use client"

import { useState, useEffect, useRef, useLayoutEffect } from "react"

interface HintProps {
  text: string
}

/**
 * Иконка «?» с подсказкой.
 * Открывается по клику/тапу — работает на мобильных (нет hover).
 * Закрывается повторным тапом, тапом вне, или клавишей Escape.
 * Тултип не вылезает за край экрана: JS-поправка после рендера.
 */
export default function Hint({ text }: HintProps) {
  const [open, setOpen]   = useState(false)
  const [nudge, setNudge] = useState(0)   // горизонтальный сдвиг в px, чтобы не вылезать за экран
  const wrapperRef        = useRef<HTMLSpanElement>(null)
  const tooltipRef        = useRef<HTMLSpanElement>(null)

  // После каждого открытия: проверяем, не вылезает ли тултип за края экрана.
  useLayoutEffect(() => {
    if (!open || !tooltipRef.current) return
    const rect = tooltipRef.current.getBoundingClientRect()
    const gap  = 8   // минимальный отступ от края (px)
    let dx = 0
    if (rect.left < gap)                          dx = gap - rect.left
    else if (rect.right > window.innerWidth - gap) dx = window.innerWidth - gap - rect.right
    setNudge(dx)
  }, [open])

  // Закрытие по тапу/клику вне тултипа
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | TouchEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown",  close)
    document.addEventListener("touchstart", close)
    return () => {
      document.removeEventListener("mousedown",  close)
      document.removeEventListener("touchstart", close)
    }
  }, [open])

  // Закрытие по Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])

  return (
    <span ref={wrapperRef} className="relative inline-block shrink-0 align-middle ml-1">
      <button
        type="button"
        aria-label={`Подсказка: ${text}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`
          inline-flex items-center justify-center
          w-4 h-4 shrink-0 rounded-full border
          text-[10px] font-bold
          cursor-pointer select-none
          transition-colors
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-slate-500
          ${open
            ? "border-slate-600 bg-slate-100 text-slate-700"
            : "border-slate-300 text-slate-400 hover:border-slate-500 hover:text-slate-600"
          }
        `}
      >
        ?
      </button>

      {open && (
        <span
          ref={tooltipRef}
          role="tooltip"
          /* nudge: если тултип вылезает за край — сдвигаем горизонтально */
          style={nudge !== 0 ? { transform: `translateX(calc(-50% + ${nudge}px))` } : undefined}
          className="
            absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20
            w-56 max-w-[calc(100vw-1rem)]
            rounded-lg bg-slate-800 px-3 py-2
            text-xs text-slate-100 leading-relaxed
            shadow-lg
          "
        >
          {text}
          {/* Стрелочка: сдвигается обратно, чтобы всегда указывала на «?» */}
          <span
            style={nudge !== 0 ? { left: `calc(50% - ${nudge}px)` } : undefined}
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"
          />
        </span>
      )}
    </span>
  )
}
