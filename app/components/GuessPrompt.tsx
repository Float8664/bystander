"use client"

import { useState } from "react"

/**
 * Фиксация догадки пользователя до показа результата.
 * Ползунок 0–100% + кнопка подтверждения. Формул здесь нет — это только ввод.
 *
 * Оформлен как ГЛАВНОЕ действие экрана (жирная рамка, крупный заголовок,
 * заметная кнопка): в мягком варианте блок читался как рядовая секция
 * и его пропускали.
 *
 * onCancel передаётся лишь при повторном редактировании: при первом заходе
 * отменять нечего, результат ещё не показан.
 */
export default function GuessPrompt({
  initialValue,
  onCommit,
  onCancel,
}: {
  initialValue: number | null
  onCommit: (v: number) => void
  onCancel?: () => void
}) {
  const [value, setValue] = useState(initialValue ?? 50)

  return (
    <div className="rounded-2xl border-2 border-slate-900 bg-white p-6 sm:p-8 shadow-lg space-y-5">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
          Шаг 1 — твоя догадка
        </p>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
          Сначала предположи
        </h2>
        <p className="text-base text-slate-600 leading-relaxed">
          Как думаешь, каков шанс, что хоть кто-то из соседей среагирует?
        </p>
      </div>

      {/* Крупная цифра — то, что пользователь сейчас выбирает */}
      <p
        className="text-6xl font-bold text-slate-900 tabular-nums leading-none"
        aria-hidden="true"
      >
        {value}%
      </p>

      <div className="space-y-2">
        <label htmlFor="guess-slider" className="sr-only">
          Твоя догадка в процентах
        </label>
        <input
          id="guess-slider"
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={`${value} процентов`}
          className="w-full h-3 rounded-full appearance-none cursor-pointer bg-slate-200 accent-emerald-600
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          type="button"
          onClick={() => onCommit(value)}
          className="w-full sm:w-auto rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white
            shadow-sm transition-colors hover:bg-slate-700
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          Зафиксировать догадку
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            Отмена
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed">
        Результат и график откроются после того, как ты зафиксируешь догадку.
        Параметры дома ниже можно менять и потом.
      </p>
    </div>
  )
}
