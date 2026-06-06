"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { computeResult, computeWitnessCount } from "@/src/lib/model/probability"
import { BUILDING_DEFAULTS } from "@/src/lib/model/constants"
import BystanderChart from "./BystanderChart"
import Explanation from "./Explanation"
import Hint from "./Hint"
import { getWhyText } from "./whyText"
import type {
  BuildingShape,
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
  acquaintance: false,
  addressed: false,
}

function parseParams(params: URLSearchParams): ScenarioInput {
  return {
    // neighbors больше не вводится напрямую — он вычисляется из формы дома
    // (computeWitnessCount). Старые ссылки вида ?neighbors=… просто игнорируются:
    // это значение всегда перезаписывается вычисленным N. Мягкая деградация, без падения.
    neighbors: DEFAULT.neighbors,
    position: (params.get("position") as Position) ?? DEFAULT.position,
    buildingType: (params.get("buildingType") as BuildingType) ?? DEFAULT.buildingType,
    timeOfDay: (params.get("timeOfDay") as TimeOfDay) ?? DEFAULT.timeOfDay,
    severity: (params.get("severity") as Severity) ?? DEFAULT.severity,
    culturalContext: (params.get("culturalContext") as CulturalContext) ?? DEFAULT.culturalContext,
    acquaintance: params.get("acquaintance") === "true",
    addressed: params.get("addressed") === "true",
  }
}

// ─── Подкомпонент: группа радио-кнопок ──────────────────────────────────────

function RadioGroup<T extends string>({
  id,
  legend,
  options,
  value,
  onChange,
  hint,
}: {
  id: string
  legend: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  hint?: string
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-sm font-medium text-slate-700">
        {legend}
        {hint && <Hint text={hint} />}
      </legend>
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

// Склонение «сосед-свидетель» по числу (форматирование текста, не модель).
function pluralNeighbors(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "сосед-свидетель"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "соседа-свидетеля"
  return "соседей-свидетелей"
}

// ─── Основной компонент ──────────────────────────────────────────────────────

export default function Calculator() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [input, setInput] = useState<ScenarioInput>(() =>
    parseParams(searchParams)
  )

  // Форма дома: из неё вычисляется число соседей-свидетелей N.
  // Стартует типовыми значениями выбранного типа дома (BUILDING_DEFAULTS).
  const [shape, setShape] = useState<BuildingShape>(
    () => BUILDING_DEFAULTS[parseParams(searchParams).buildingType]
  )

  // router.replace дебаунсится — URL обновляется только после паузы в 400ms,
  // чтобы не дёргать Next.js-роутер на каждое изменение
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncUrl = useCallback(
    (next: ScenarioInput) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams({
          position: next.position,
          buildingType: next.buildingType,
          timeOfDay: next.timeOfDay,
          severity: next.severity,
          culturalContext: next.culturalContext,
          acquaintance: String(next.acquaintance),
          addressed: String(next.addressed),
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

  // Смена типа дома сбрасывает форму на типовые значения этого типа.
  const changeBuildingType = useCallback(
    (v: BuildingType) => {
      update({ buildingType: v })
      setShape(BUILDING_DEFAULTS[v])
    },
    [update]
  )

  // При первой загрузке: если URL пустой — записываем дефолты
  useEffect(() => {
    if (searchParams.toString() === "") syncUrl(input)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Число соседей-свидетелей выводится из формы дома и позиции квартиры.
  const houseN = useMemo(
    () => computeWitnessCount(shape, input.position),
    [shape, input.position]
  )
  // Вход для модели: всё из input, но neighbors — это вычисленное N.
  const modelInput = useMemo<ScenarioInput>(
    () => ({ ...input, neighbors: houseN }),
    [input, houseN]
  )

  // computeResult — чистая функция, мемоизируем чтобы не пересчитывать лишний раз
  const result = useMemo(() => computeResult(modelInput), [modelInput])
  const pInd = (result.pIndividual * 100).toFixed(1)
  const pAny = (result.pAtLeastOne * 100).toFixed(1)

  return (
    <section aria-label="Калькулятор эффекта свидетеля" className="w-full max-w-2xl mx-auto space-y-8">

      {/* Форма ввода */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">

        {/* Вычисленное число свидетелей — всегда на виду */}
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          aria-live="polite"
        >
          <p className="text-sm text-slate-600">
            В таком доме —{" "}
            <span className="font-bold text-slate-900">примерно {houseN}</span>{" "}
            {pluralNeighbors(houseN)}.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Число считается из параметров дома — настрой их ниже.
          </p>
        </div>

        <RadioGroup
          id="severity"
          legend="Серьёзность ситуации"
          hint="Незначительная — например, громкая музыка. Умеренная — крик или скандал за стеной. Серьёзная — явная угроза, звон бьющегося стекла, крики о помощи."
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
          hint="Хрущёвка — тонкие стены, хорошо слышно. Панельный — средняя слышимость, соседи почти незнакомы. Элитный ЖК — толстые стены, высокая анонимность. Частный дом — соседи знают друг друга."
          options={BUILDING_OPTIONS}
          value={input.buildingType}
          onChange={changeBuildingType}
        />

        <RadioGroup
          id="position"
          legend="Квартира"
          hint="Средняя — больше общих стен с соседями, лучше слышно. Угловая — меньше общих стен, меньше соседей, которые могут что-то заметить."
          options={POSITION_OPTIONS}
          value={input.position}
          onChange={(v) => update({ position: v })}
        />

        <RadioGroup
          id="culturalContext"
          legend="Культурный контекст"
          hint="Высокая солидарность — в этой среде принято вмешиваться и помогать соседям. Смешанная — по-разному. Низкая — в этой среде не принято лезть в чужие дела."
          options={CULTURAL_OPTIONS}
          value={input.culturalContext}
          onChange={(v) => update({ culturalContext: v })}
        />

        {/* Тумблер знакомства */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-sm font-medium text-slate-700 flex items-center">
            Соседи знакомы между собой
            <Hint text="В доме, где люди знают друг друга, труднее думать «поможет кто-то другой» — сложнее оставаться в стороне, когда знаешь человека лично." />
          </span>
          <button
            role="switch"
            aria-checked={input.acquaintance}
            aria-label="Соседи знакомы между собой"
            onClick={() => update({ acquaintance: !input.acquaintance })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-slate-800
              ${input.acquaintance ? "bg-slate-800" : "bg-slate-200"}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm
                transform transition-transform duration-200
                ${input.acquaintance ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>

        {/* Тумблер адресного обращения */}
        <div className={`flex items-center justify-between pt-1 pb-1 px-3 rounded-xl transition-colors
          ${input.addressed ? "bg-blue-50 border border-blue-200" : ""}`}>
          <span className="text-sm font-medium text-slate-700 flex items-center">
            Обращаюсь к конкретному соседу
            <Hint text="«Эй, ты, в синей куртке, вызови скорую» — личное обращение снимает «пусть поможет кто-то другой». Посмотри, как изменится график." />
          </span>
          <button
            role="switch"
            aria-checked={input.addressed}
            aria-label="Обращаюсь к конкретному соседу"
            onClick={() => update({ addressed: !input.addressed })}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent
              transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2
              focus-visible:outline-blue-600
              ${input.addressed ? "bg-blue-600" : "bg-slate-200"}`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm
                transform transition-transform duration-200
                ${input.addressed ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
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
        {/* Главная цифра — итог */}
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            Шанс, что поможет хоть кто-то
          </p>
          <p className="text-5xl font-bold text-slate-900" aria-live="polite">{pAny}%</p>
        </div>

        {/* Фраза-мостик: связывает обе цифры в одну мысль */}
        <p className="mt-4 text-sm text-slate-600 leading-relaxed" aria-live="polite">
          Каждый сосед сам по себе среагирует лишь с шансом{" "}
          <span className="font-semibold text-slate-800">{pInd}%</span> —
          каждый надеется, что это сделает кто-то другой.
          Но соседей{" "}
          <span className="font-semibold text-slate-800">{houseN}</span>,
          поэтому шанс, что среагирует хоть кто-нибудь, —{" "}
          <span className="font-semibold text-slate-800">{pAny}%</span>.
        </p>

        {/* Вспомогательная цифра — объяснение */}
        <div className="mt-3 space-y-0.5">
          <p className="text-xs text-slate-400">Шанс одного конкретного соседа</p>
          <p className="text-xl font-semibold text-slate-400">{pInd}%</p>
        </div>

        {/* Динамическое объяснение текущего выбора */}
        <p className="mt-3 text-sm text-slate-500 leading-relaxed" aria-live="polite">
          {getWhyText(modelInput)}
        </p>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Значения иллюстративны. Формула: P = 1 − (1 − p<sub>инд</sub>)<sup>N</sup>,
          где p<sub>инд</sub> убывает с ростом N (диффузия ответственности по Darley &amp; Latané, 1968).
          Не является эмпирически валидированным прогнозом.
        </p>
      </div>

      {/* График */}
      <BystanderChart input={modelInput} houseN={houseN} />

      {/* Пояснение */}
      <Explanation />

    </section>
  )
}
