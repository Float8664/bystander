"use client"

import { useState } from "react"

/**
 * Фиксация догадки пользователя до показа результата.
 * Ползунок 0–100% + кнопка подтверждения. Формул здесь нет — это только ввод.
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-slate-800">
          Сначала предположи
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Как думаешь, каков шанс, что хоть кто-то из соседей среагирует?
        </p>
      </div>

      {/* Крупная цифра — то, что пользователь сейчас выбирает */}
      <p className="text-5xl font-bold text-slate-900 tabular-nums" aria-hidden="true">
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
          className="w-full h-3 rounded-full appearance-none cursor-pointer bg-slate-200 accent-blue-600
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        />
        <div className="flex justify-between text-xs text-slate-400">
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onCommit(value)}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white
            transition-colors hover:bg-slate-700
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
        Настройки дома выше можно менять и потом.
      </p>
    </div>
  )
}
