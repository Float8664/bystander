"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Label } from "@/components/ui/label"
import { computeResult } from "@/src/lib/model/probability"
import BystanderChart from "./BystanderChart"
import type {
  BuildingType,
  CulturalContext,
  Position,
  ScenarioInput,
  Severity,
  TimeOfDay,
} from "@/src/lib/model/types"

// ─── Справочники для отображения ────────────────────────────────────────────

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: "minor", label: "Незначительная" },
  { value: "moderate", label: "Умеренная" },
  { value: "serious", label: "Серьёзная" },
]

const TIME_OPTIONS: { value: TimeOfDay; label: string }[] = [
  { value: "morning", label: "Утро" },
  { value: "day", label: "День" },
  { value: "evening", label: "Вечер" },
  { value: "night", label: "Ночь" },
]

const BUILDING_OPTIONS: { value: BuildingType; label: string }[] = [
  { value: "khrushchevka", label: "Хрущёвка" },
  { value: "panel", label: "Панельный" },
  { value: "elite", label: "Элитный ЖК" },
  { value: "private", label: "Частный дом" },
]

const POSITION_OPTIONS: { value: Position; label: string }[] = [
  { value: "middle", label: "Средняя" },
  { value: "corner", label: "Угловая" },
]

const CULTURAL_OPTIONS: { value: CulturalContext; label: string }[] = [
  { value: "high_solidarity", label: "Высокая солидарность" },
  { value: "mixed", label: "Смешанная" },
  { value: "low_solidarity", label: "Низкая солидарность" },
]

// ─── Значения по умолчанию ───────────────────────────────────────────────────

const DEFAULT: ScenarioInput = {
  neighbors: 10,
  position: "middle",
  buildingType: "panel",
  timeOfDay: "day",
  severity: "moderate",
  culturalContext: "mixed",
}

function parseParams(params: URLSearchParams): ScenarioInput {
  return {
    neighbors: Math.min(50, Math.max(1, Number(params.get("neighbors") ?? DEFAULT.neighbors))),
    position: (params.get("position") as Position) ?? DEFAULT.position,
    buildingType: (params.get("buildingType") as BuildingType) ?? DEFAULT.buildingType,
    timeOfDay: (params.get("timeOfDay") as TimeOfDay) ?? DEFAULT.timeOfDay,
    severity: (params.get("severity") as Severity) ?? DEFAULT.severity,
    culturalContext: (params.get("culturalContext") as CulturalContext) ?? DEFAULT.culturalContext,
  }
}

// ─── Подкомпонент: группа радио-кнопок ──────────────────────────────────────

function RadioGroup<T extends string>({
  id,
  legend,
  options,
  value,
  onChange,
}: {
  id: string
  legend: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium text-slate-700">{legend}</legend>
      <div className="flex flex-wrap gap-2 pt-1">
        {options.map((opt) => {
          const inputId = `${id}-${opt.value}`
          const isChecked = opt.value === value
          return (
            <label
              key={opt.value}
              htmlFor={inputId}
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors
                ${isChecked
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-500"
                }`}
            >
              <input
                type="radio"
                id={inputId}
                name={id}
                value={opt.value}
                checked={isChecked}
                onChange={() => onChange(opt.value)}
                className="sr-only"
              />
              {opt.label}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

// ─── Основной компонент ──────────────────────────────────────────────────────

export default function Calculator() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [input, setInput] = useState<ScenarioInput>(() =>
    parseParams(searchParams)
  )

  // router.replace дебаунсится — URL обновляется только после паузы в 400ms,
  // чтобы не дёргать Next.js-роутер на каждый пиксель ползунка
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncUrl = useCallback(
    (next: ScenarioInput) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams({
          neighbors: String(next.neighbors),
          position: next.position,
          buildingType: next.buildingType,
          timeOfDay: next.timeOfDay,
          severity: next.severity,
          culturalContext: next.culturalContext,
        })
        router.replace(`?${params.toString()}`, { scroll: false })
      }, 400)
    },
    [router]
  )

  const update = useCallback(
    (patch: Partial<ScenarioInput>) => {
      setInput((prev) => {
        const next = { ...prev, ...patch }
        syncUrl(next)
        return next
      })
    },
    [syncUrl]
  )

  // При первой загрузке: если URL пустой — записываем дефолты
  useEffect(() => {
    if (searchParams.toString() === "") syncUrl(input)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // computeResult — чистая функция, мемоизируем чтобы не пересчитывать лишний раз
  const result = useMemo(() => computeResult(input), [input])
  const pInd = (result.pIndividual * 100).toFixed(1)
  const pAny = (result.pAtLeastOne * 100).toFixed(1)

  return (
    <section aria-label="Калькулятор эффекта свидетеля" className="w-full max-w-2xl mx-auto space-y-8">

      {/* Форма ввода */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">

        {/* Слайдер числа соседей */}
        <div className="space-y-3">
          <Label htmlFor="neighbors-slider" className="text-sm font-medium text-slate-700">
            Число соседей (N):{" "}
            <span className="font-bold text-slate-900" aria-live="polite">
              {input.neighbors}
            </span>
          </Label>
          <input
            id="neighbors-slider"
            type="range"
            min={1}
            max={50}
            step={1}
            value={input.neighbors}
            onChange={(e) => update({ neighbors: Number(e.target.value) })}
            aria-label="Число соседей"
            aria-valuemin={1}
            aria-valuemax={50}
            aria-valuenow={input.neighbors}
            className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-slate-800"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>1</span>
            <span>50</span>
          </div>
        </div>

        <RadioGroup
          id="severity"
          legend="Серьёзность ситуации"
          options={SEVERITY_OPTIONS}
          value={input.severity}
          onChange={(v) => update({ severity: v })}
        />

        <RadioGroup
          id="timeOfDay"
          legend="Время суток"
          options={TIME_OPTIONS}
          value={input.timeOfDay}
          onChange={(v) => update({ timeOfDay: v })}
        />

        <RadioGroup
          id="buildingType"
          legend="Тип дома"
          options={BUILDING_OPTIONS}
          value={input.buildingType}
          onChange={(v) => update({ buildingType: v })}
        />

        <RadioGroup
          id="position"
          legend="Квартира"
          options={POSITION_OPTIONS}
          value={input.position}
          onChange={(v) => update({ position: v })}
        />

        <RadioGroup
          id="culturalContext"
          legend="Культурный контекст"
          options={CULTURAL_OPTIONS}
          value={input.culturalContext}
          onChange={(v) => update({ culturalContext: v })}
        />
      </div>

      {/* Результат */}
      <div
        role="region"
        aria-label="Результат расчёта"
        aria-live="polite"
        className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
      >
        <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400 mb-4">
          Иллюстративный результат
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-500">
              Вероятность реакции одного соседа
            </p>
            <p className="text-4xl font-bold text-slate-900">{pInd}%</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500">
              Хотя бы один из {input.neighbors} среагирует
            </p>
            <p className="text-4xl font-bold text-slate-900">{pAny}%</p>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-400 leading-relaxed">
          Значения иллюстративны. Формула: P = 1 − (1 − p<sub>инд</sub>)<sup>N</sup>,
          где p<sub>инд</sub> убывает с ростом N (диффузия ответственности по Darley &amp; Latané, 1968).
          Не является эмпирически валидированным прогнозом.
        </p>
      </div>

      {/* График */}
      <BystanderChart input={input} />

    </section>
  )
}
