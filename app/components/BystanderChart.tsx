"use client"

import { useMemo } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts"
import { computeResult, computeNaive } from "@/src/lib/model/probability"
import type { ScenarioInput } from "@/src/lib/model/types"

const pct = (v: number) => Math.round(v * 1000) / 10

// Верхняя граница оси N: ~2× от числа свидетелей, с полом 20 и «красивым»
// округлением вверх. Так точка «ваш дом» всегда видна с запасом, а хвост кривой
// показывает выход на полку — даже для ЖК с сотнями свидетелей.
function niceAxisMax(n: number): number {
  const target = Math.max(20, Math.ceil(n * 2))
  const step = target <= 50 ? 10 : target <= 200 ? 25 : target <= 1000 ? 50 : 200
  return Math.ceil(target / step) * step
}

interface Props {
  input: ScenarioInput
  houseN: number
  experimentN: number | null
}

export default function BystanderChart({ input, houseN, experimentN }: Props) {
  // Ось должна вмещать и дом, и точку эксперимента (если она дальше дома).
  const axisMax = useMemo(
    () => niceAxisMax(Math.max(houseN, experimentN ?? 0)),
    [houseN, experimentN]
  )

  // Точку эксперимента показываем, только если слайдер трогали и она не совпала
  // с домом — иначе две точки сольются и запутают.
  const showExperiment = experimentN !== null && experimentN !== houseN

  // Кривые строятся через функции модели — формул в компоненте нет.
  // При больших axisMax берём не каждое N, а ~80 точек, чтобы не считать тысячи раз.
  const data = useMemo(() => {
    const sampleStep = Math.max(1, Math.ceil(axisMax / 80))
    const xs: number[] = []
    for (let n = 1; n <= axisMax; n += sampleStep) xs.push(n)
    if (xs[xs.length - 1] !== axisMax) xs.push(axisMax)
    return xs.map((n) => ({
      n,
      real: pct(computeResult({ ...input, neighbors: n }).pAtLeastOne),
      naive: pct(computeNaive({ ...input, neighbors: n }).pAtLeastOne),
    }))
  }, [
    axisMax,
    input.severity,
    input.timeOfDay,
    input.buildingType,
    input.position,
    input.culturalContext,
    input.acquaintance,
    input.addressed,
  ])

  // Точку «ваш дом» считаем напрямую через модель, не из выборки data —
  // так y точно совпадает с N, без ошибок округления шага выборки.
  const houseY = useMemo(
    () => pct(computeResult({ ...input, neighbors: houseN }).pAtLeastOne),
    [input, houseN]
  )

  const experimentY = useMemo(
    () =>
      experimentN !== null
        ? pct(computeResult({ ...input, neighbors: experimentN }).pAtLeastOne)
        : null,
    [input, experimentN]
  )

  return (
    <div
      role="img"
      aria-label={
        `График: в вашем доме примерно ${houseN} соседей, реальный шанс помощи ${houseY}%.` +
        (showExperiment ? ` В эксперименте ${experimentN} соседей — шанс ${experimentY}%.` : "")
      }
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-800 mb-1">
        Помогут ли соседи — и как это зависит от их числа
      </h2>
      <p className="text-xs text-slate-400 mb-4">Меняй параметры выше — кривые обновятся</p>

      {/* Легенда-подписи линий — HTML, не на графике */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 mb-4 text-xs">
        <span className="flex items-center gap-1.5 text-slate-800 font-medium">
          <span className="inline-block w-6 h-0.5 bg-slate-800 rounded" />
          На самом деле
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="inline-block w-6 border-t-2 border-dashed border-slate-400" />
          Как нам кажется
        </span>
        <span className="flex items-center gap-1.5 text-blue-600 font-medium">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white shadow" />
          Ваш дом
        </span>
        {showExperiment && (
          <span className="flex items-center gap-1.5 text-amber-600 font-medium">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-600 border-2 border-white shadow" />
            Эксперимент
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="n"
            type="number"
            domain={[1, axisMax]}
            allowDecimals={false}
            label={{ value: "Число соседей", position: "insideBottom", offset: -4, fontSize: 12, fill: "#94a3b8" }}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            height={44}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            label={{ value: "Вероятность", angle: -90, position: "insideLeft", offset: 12, fontSize: 12, fill: "#94a3b8" }}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            width={56}
          />
          <Tooltip
            formatter={(value, name) => [
              typeof value === "number" ? `${value}%` : "—",
              name === "real" ? "На самом деле" : "Как нам кажется",
            ]}
            labelFormatter={(n) => `Соседей: ${n}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />

          {/* Пунктирная — «как нам кажется» */}
          <Line
            type="monotone"
            dataKey="naive"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 3, fill: "#94a3b8" }}
            isAnimationActive={true}
            animationDuration={500}
          />

          {/* Сплошная — «на самом деле» */}
          <Line
            type="monotone"
            dataKey="real"
            stroke="#1e293b"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: "#1e293b" }}
            isAnimationActive={true}
            animationDuration={500}
          />

          {/* Точка «ваш дом» — синяя, вычислена напрямую через модель */}
          {houseN >= 1 && (
            <ReferenceDot
              x={houseN}
              y={houseY}
              r={7}
              fill="#2563eb"
              stroke="white"
              strokeWidth={2}
              label={{
                value: `ваш дом — ${houseY}%`,
                position: houseN > axisMax * 0.6 ? "left" : "right",
                fontSize: 12,
                fontWeight: 600,
                fill: "#2563eb",
              }}
            />
          )}

          {/* Точка «эксперимент» — янтарная, отдельно от «ваш дом» */}
          {showExperiment && experimentN !== null && experimentY !== null && (
            <ReferenceDot
              x={experimentN}
              y={experimentY}
              r={6}
              fill="#d97706"
              stroke="white"
              strokeWidth={2}
              label={{
                value: `эксперимент — ${experimentY}%`,
                position: experimentN > axisMax * 0.6 ? "left" : "right",
                fontSize: 12,
                fontWeight: 600,
                fill: "#d97706",
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
