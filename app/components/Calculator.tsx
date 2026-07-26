"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { computeResult, computeWitnessCount } from "@/src/lib/model/probability"
import { BUILDING_DEFAULTS } from "@/src/lib/model/constants"
import BystanderChart from "./BystanderChart"
import Explanation from "./Explanation"
import GuessPrompt from "./GuessPrompt"
import Hint from "./Hint"
import { getWhyText } from "./whyText"
import { getGuessDelta, getGuessReaction } from "./guessReaction"
import {
  getGuessServerSnapshot,
  getGuessSnapshot,
  storeGuess,
  subscribeToGuess,
} from "./guessStore"
import type {
  BuildingShape,
  BuildingType,
  CulturalContext,
  Position,
  ScenarioInput,
  Severity,
  TimeOfDay,
  WitnessScope,
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

const SCOPE_OPTIONS: { value: WitnessScope; label: string }[] = [
  { value: "whole_building", label: "Весь дом" },
  { value: "my_entrance", label: "Мой подъезд" },
  { value: "my_floor_plus_adjacent", label: "Мой этаж и соседи" },
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

// Форма дома из URL. Если параметров нет — берём типовые значения выбранного типа.
// Любой кривой ввод мягко откатывается к дефолту (без падения).
function parseShape(params: URLSearchParams, buildingType: BuildingType): BuildingShape {
  const def = BUILDING_DEFAULTS[buildingType]
  const posInt = (key: string, fallback: number): number => {
    const v = Number(params.get(key))
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback
  }
  const scopeRaw = params.get("scope")
  const witnessScope: WitnessScope =
    scopeRaw === "whole_building" || scopeRaw === "my_entrance" || scopeRaw === "my_floor_plus_adjacent"
      ? scopeRaw
      : def.witnessScope

  const housesRaw = params.get("houses")
  // neighboringHouses присутствует только у частного дома (или если явно задан в URL).
  const neighboringHouses =
    housesRaw !== null
      ? Math.max(0, Math.floor(Number(housesRaw)) || 0)
      : def.neighboringHouses

  return {
    apartmentsPerFloor: posInt("apf", def.apartmentsPerFloor),
    floors: posInt("floors", def.floors),
    entrances: posInt("entrances", def.entrances),
    witnessScope,
    ...(neighboringHouses !== undefined ? { neighboringHouses } : {}),
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
      <legend className="flex items-center text-sm font-medium text-slate-700">
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

// ─── Подкомпонент: числовое поле с подсказкой ───────────────────────────────
// Локальный строковый стейт позволяет полю быть временно пустым во время ввода.
// Валидация и коллбэк вызываются только при потере фокуса (onBlur).

function NumberField({
  id,
  label,
  hint,
  value,
  min = 0,
  onChange,
}: {
  id: string
  label: string
  hint?: string
  value: number
  min?: number
  onChange: (v: number) => void
}) {
  const [localValue, setLocalValue] = useState(String(value))
  const focused = useRef(false)

  // Синхронизируем локальный стейт с внешним значением (например, при сбросе URL),
  // но только когда поле не в фокусе — иначе прервём ввод пользователя.
  useEffect(() => {
    if (!focused.current) setLocalValue(String(value))
  }, [value])

  function commit(raw: string) {
    const parsed = Math.floor(Number(raw))
    const valid = Number.isFinite(parsed) && parsed >= min ? parsed : min
    setLocalValue(String(valid))
    if (valid !== value) onChange(valid)
  }

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700 flex items-center">
        {label}
        {hint && <Hint text={hint} />}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onFocus={() => { focused.current = true }}
        onBlur={(e) => {
          focused.current = false
          commit(e.target.value)
        }}
        className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-800
          focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
      />
    </div>
  )
}

// Склонение «квартира» по числу (форматирование текста, не модель).
// Модель считает именно квартиры, а не людей, — текст должен это отражать.
function pluralApartments(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return "квартира"
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "квартиры"
  return "квартир"
}

// ─── Основной компонент ──────────────────────────────────────────────────────

export default function Calculator() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [input, setInput] = useState<ScenarioInput>(() =>
    parseParams(searchParams)
  )

  // Форма дома: из неё вычисляется число соседей-свидетелей N.
  // Стартует значениями из URL, иначе — типовыми для выбранного типа дома.
  const [shape, setShape] = useState<BuildingShape>(() =>
    parseShape(
      searchParams,
      (searchParams.get("buildingType") as BuildingType) ?? DEFAULT.buildingType
    )
  )

  const update = useCallback((patch: Partial<ScenarioInput>) => {
    setInput((prev) => ({ ...prev, ...patch }))
  }, [])

  const updateShape = useCallback((patch: Partial<BuildingShape>) => {
    setShape((prev) => ({ ...prev, ...patch }))
  }, [])

  // Смена типа дома сбрасывает форму на типовые значения этого типа.
  const changeBuildingType = useCallback((v: BuildingType) => {
    setInput((prev) => ({ ...prev, buildingType: v }))
    setShape(BUILDING_DEFAULTS[v])
  }, [])

  // URL отражает и сценарий, и форму дома — чтобы ссылка воспроизводила состояние.
  // Дебаунс 400ms. Пишем в URL только если строка реально изменилась — иначе
  // повторный router.replace под Suspense-границей зацикливает ре-рендер.
  useEffect(() => {
    const params = new URLSearchParams({
      position: input.position,
      buildingType: input.buildingType,
      timeOfDay: input.timeOfDay,
      severity: input.severity,
      culturalContext: input.culturalContext,
      acquaintance: String(input.acquaintance),
      addressed: String(input.addressed),
      apf: String(shape.apartmentsPerFloor),
      floors: String(shape.floors),
      entrances: String(shape.entrances),
      scope: shape.witnessScope,
      ...(shape.neighboringHouses !== undefined
        ? { houses: String(shape.neighboringHouses) }
        : {}),
    })
    const qs = params.toString()
    const timer = setTimeout(() => {
      const current = window.location.search.replace(/^\?/, "")
      if (qs !== current) {
        router.replace(`?${qs}`, { scroll: false })
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [input, shape, router])

  // Раскрытие блока «Уточнить параметры дома» (свёрнут по умолчанию).
  const [shapeOpen, setShapeOpen] = useState(false)

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

  // Ползунок-исследование «а что если соседей было бы больше/меньше».
  // experimentN === null, пока слайдер не трогали — на графике только точка «ваш дом».
  const [experimentOpen, setExperimentOpen] = useState(false)
  const experimentMax = Math.max(50, Math.ceil(houseN * 2))

  // Эксперимент запоминает, для какого дома он поставлен. Сброс при смене дома
  // не хранится в состоянии, а ВЫВОДИТСЯ: если forHouseN больше не совпадает
  // с текущим houseN, точка считается устаревшей и не показывается. Так не нужен
  // эффект с setState — иначе получался лишний каскадный ре-рендер.
  const [experiment, setExperiment] = useState<{ n: number; forHouseN: number } | null>(null)
  const experimentN = experiment !== null && experiment.forHouseN === houseN ? experiment.n : null

  const setExperimentN = useCallback(
    (n: number | null) => {
      setExperiment(n === null ? null : { n, forHouseN: houseN })
    },
    [houseN]
  )

  // ─── Догадка пользователя ────────────────────────────────────────────────
  // Живёт в sessionStorage (см. guessStore). Читаем через useSyncExternalStore:
  // компонент рендерится и на сервере, где sessionStorage нет, и чтение
  // в инициализаторе useState давало null навсегда — вернувшийся пользователь
  // снова видел вопрос, хотя догадка была сохранена.
  const guess = useSyncExternalStore(
    subscribeToGuess,
    getGuessSnapshot,
    getGuessServerSnapshot
  )
  const [editingGuess, setEditingGuess] = useState(false)

  const commitGuess = useCallback((v: number) => {
    storeGuess(v)
    setEditingGuess(false)
  }, [])

  // Показываем результат только когда догадка зафиксирована и не редактируется.
  const showResults = guess !== null && !editingGuess

  // Якорь на блок догадки — из заглушки внизу и при переходе к «изменить догадку».
  const guessRef = useRef<HTMLDivElement>(null)
  const scrollToGuess = useCallback(() => {
    guessRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  // «Изменить догадку» открывает блок наверху — сам по себе он остался бы
  // за экраном, поэтому прокручиваем к нему после появления.
  useEffect(() => {
    if (editingGuess) scrollToGuess()
  }, [editingGuess, scrollToGuess])

  return (
    <section aria-label="Калькулятор эффекта свидетеля" className="w-full max-w-2xl mx-auto space-y-8">

      {/* Догадка — первое на экране, пока не зафиксирована. Стоит ВЫШЕ формы
          намеренно: снизу её не замечали и страница читалась как статичная.
          Параметры дома остаются доступными ниже — их можно менять и после. */}
      {!showResults && (
        <div ref={guessRef} className="scroll-mt-6">
          <GuessPrompt
            initialValue={guess}
            onCommit={commitGuess}
            onCancel={guess !== null ? () => setEditingGuess(false) : undefined}
          />
        </div>
      )}

      {/* Форма ввода */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">

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
          hint="Хрущёвка — тонкие стены, хорошо слышно. Панельный — средняя слышимость, соседи чаще всего незнакомы. Элитный ЖК — толстые стены, выше анонимность. Частный дом — соседи чаще знают друг друга."
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

        {/* Уточнить параметры дома — свёрнуто по умолчанию */}
        <div className="rounded-xl border border-slate-200">
          <button
            type="button"
            aria-expanded={shapeOpen}
            aria-controls="shape-panel"
            onClick={() => setShapeOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            <span>Уточнить параметры дома</span>
            <span
              aria-hidden="true"
              className={`text-slate-400 transition-transform duration-200 ${shapeOpen ? "rotate-90" : ""}`}
            >
              ▸
            </span>
          </button>

          {shapeOpen && (
            <div id="shape-panel" className="space-y-4 border-t border-slate-200 px-4 py-4">
              {input.buildingType === "private" ? (
                <NumberField
                  id="shape-houses"
                  label="Сколько соседних домов рядом"
                  hint="Сколько соседних домов достаточно близко, чтобы заметить происходящее. Из этого числа складывается N."
                  value={shape.neighboringHouses ?? 0}
                  min={0}
                  onChange={(v) => updateShape({ neighboringHouses: v })}
                />
              ) : (
                <>
                  <div className="flex flex-wrap gap-4">
                    <NumberField
                      id="shape-apf"
                      label="Квартир на этаже"
                      hint="Сколько квартир на одной площадке (этаже) в вашем подъезде."
                      value={shape.apartmentsPerFloor}
                      min={1}
                      onChange={(v) => updateShape({ apartmentsPerFloor: v })}
                    />
                    <NumberField
                      id="shape-floors"
                      label="Этажей"
                      hint="Сколько этажей в доме."
                      value={shape.floors}
                      min={1}
                      onChange={(v) => updateShape({ floors: v })}
                    />
                    <NumberField
                      id="shape-entrances"
                      label="Подъездов"
                      hint="Сколько подъездов в доме. Влияет на N только если считать свидетелями весь дом."
                      value={shape.entrances}
                      min={1}
                      onChange={(v) => updateShape({ entrances: v })}
                    />
                  </div>
                  <RadioGroup
                    id="witnessScope"
                    legend="Кого считать свидетелями"
                    hint="Весь дом — все квартиры. Мой подъезд — только ваш подъезд. Мой этаж и соседи — ваш этаж плюс по одному сверху и снизу. От этого зависит число N."
                    options={SCOPE_OPTIONS}
                    value={shape.witnessScope}
                    onChange={(v) => updateShape({ witnessScope: v })}
                  />
                </>
              )}
            </div>
          )}
        </div>

        {/* Вычисленное число свидетелей — под параметрами дома, из которых оно считается */}
        <div
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
          aria-live="polite"
        >
          <p className="text-sm text-slate-600">
            В таком доме —{" "}
            <span className="font-bold text-slate-900">примерно {houseN}</span>{" "}
            {pluralApartments(houseN)}.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Число считается из параметров дома — настрой их выше.
          </p>
        </div>

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
            Соседи знают друг друга
            <Hint text="Там, где соседи знают друг друга, труднее переложить ответственность на «кого-то другого»: сложнее остаться в стороне, когда знаешь человека лично." />
          </span>
          <button
            role="switch"
            aria-checked={input.acquaintance}
            aria-label="Соседи знают друг друга"
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

      {/* Заглушка на месте результата и графика: доскроллив до пустоты,
          человек понимает причину и знает, куда вернуться. */}
      {!showResults && (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/50 p-8 text-center">
          <p className="text-sm text-slate-500 leading-relaxed">
            Результат и график появятся, когда ты зафиксируешь догадку{" "}
            <span aria-hidden="true">↑</span>
          </p>
          <button
            type="button"
            onClick={scrollToGuess}
            className="mt-3 text-sm font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            Вернуться к догадке
          </button>
        </div>
      )}

      {showResults && guess !== null && (
        <>
          {/* Результат */}
          <div
            role="region"
            aria-label="Результат расчёта"
            aria-live="polite"
            className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
          >
            <h2 className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">
              Иллюстративный результат
            </h2>

            {/* Главный контраст: догадка против расчёта — первое, что видит глаз */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500">Ты предположил</p>
                <p className="text-3xl sm:text-4xl font-bold text-slate-400 tabular-nums">
                  {guess}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500">На самом деле</p>
                <p className="text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums">
                  {pAny}%
                </p>
              </div>
            </div>

            {/* Живая реакция на величину промаха */}
            <p className="mt-4 text-base text-slate-700 leading-relaxed">
              {getGuessReaction(guess, Number(pAny))}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Твоя догадка {getGuessDelta(guess, Number(pAny))}.{" "}
              <button
                type="button"
                onClick={() => setEditingGuess(true)}
                className="underline underline-offset-2 hover:text-slate-600
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
              >
                Изменить догадку
              </button>
            </p>

            {/* Ниже и спокойнее — разбор, откуда взялась цифра */}
            <div className="mt-6 border-t border-slate-200 pt-4 space-y-3">
              <p className="text-sm text-slate-600 leading-relaxed" aria-live="polite">
                Каждый сосед сам по себе среагирует лишь с шансом{" "}
                <span className="font-semibold text-slate-800">{pInd}%</span> —
                каждый надеется, что это сделает кто-то другой.
                Но соседей{" "}
                <span className="font-semibold text-slate-800">{houseN}</span>,
                поэтому шанс, что среагирует хоть кто-нибудь, —{" "}
                <span className="font-semibold text-slate-800">{pAny}%</span>.
              </p>

              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Шанс одного конкретного соседа</p>
                <p className="text-lg font-semibold text-slate-400 tabular-nums">{pInd}%</p>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed" aria-live="polite">
                {getWhyText(modelInput)}
              </p>

              <p className="text-xs text-slate-400 leading-relaxed">
                Значения иллюстративны. Формула: P = 1 − (1 − p<sub>инд</sub>)<sup>N</sup>,
                где p<sub>инд</sub> убывает с ростом N (диффузия ответственности по Darley &amp; Latané, 1968).
                Не является эмпирически валидированным прогнозом.
              </p>
            </div>
          </div>

      {/* Ползунок-исследование «а что если» — свёрнут по умолчанию */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          aria-expanded={experimentOpen}
          aria-controls="experiment-panel"
          onClick={() => setExperimentOpen((v) => !v)}
          className="flex w-full items-center justify-between text-left text-sm font-medium text-slate-700
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
        >
          <span>А что если соседей было бы больше или меньше?</span>
          <span
            aria-hidden="true"
            className={`text-slate-400 transition-transform duration-200 ${experimentOpen ? "rotate-90" : ""}`}
          >
            ▸
          </span>
        </button>

        {experimentOpen && (
          <div id="experiment-panel" className="mt-4 space-y-3">
            <p className="text-sm text-slate-500">
              Подвигай ползунок и сравни с точкой «ваш дом».
            </p>
            <label htmlFor="experiment-slider" className="text-sm font-medium text-slate-700">
              Соседей в эксперименте:{" "}
              <span className="font-bold text-amber-600" aria-live="polite">
                {experimentN ?? houseN}
              </span>
            </label>
            <input
              id="experiment-slider"
              type="range"
              min={1}
              max={experimentMax}
              step={1}
              value={experimentN ?? houseN}
              onChange={(e) => setExperimentN(Number(e.target.value))}
              aria-label="Число соседей в эксперименте"
              aria-valuemin={1}
              aria-valuemax={experimentMax}
              aria-valuenow={experimentN ?? houseN}
              className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-amber-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>1</span>
              <span>{experimentMax}</span>
            </div>
            {experimentN !== null && experimentN !== houseN && (
              <button
                type="button"
                onClick={() => setExperimentN(null)}
                className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700"
              >
                Вернуться к вашему дому ({houseN})
              </button>
            )}
          </div>
        )}
      </div>

      {/* График */}
          <BystanderChart
            input={modelInput}
            houseN={houseN}
            experimentN={experimentN}
            guess={guess}
          />

          {/* Пояснение — тоже под воротами: оно раскрывает развязку
              («шанс падает, а не растёт») и до догадки было бы спойлером. */}
          <Explanation />
        </>
      )}

    </section>
  )
}
