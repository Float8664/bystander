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

interface Props {
  input: ScenarioInput
}

export default function BystanderChart({ input }: Props) {
  // Обе кривые строятся через функции модели — формул в компоненте нет.
  const data = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => {
      const n = i + 1
      const real  = computeResult({ ...input, neighbors: n })
      const naive = computeNaive({ ...input, neighbors: n })
      return {
        n,
        real:  pct(real.pAtLeastOne),
        naive: pct(naive.pAtLeastOne),
      }
    })
  }, [
    input.severity,
    input.timeOfDay,
    input.buildingType,
    input.position,
    input.culturalContext,
  ])

  const currentReal = data[input.neighbors - 1]

  return (
    <div
      role="img"
      aria-label={`График: при N=${input.neighbors} реальный шанс ${currentReal?.real}%, интуитивный ${data[input.neighbors - 1]?.naive}%.`}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-base font-semibold text-slate-800 mb-1">
        Помогут ли соседи — и как это зависит от их числа
      </h2>
      <p className="text-xs text-slate-400 mb-4">Меняй параметры выше — кривые обновятся</p>

      {/* Легенда-подписи линий — HTML, не на графике */}
      <div className="flex gap-5 mb-4 text-xs">
        <span className="flex items-center gap-1.5 text-slate-800 font-medium">
          <span className="inline-block w-6 h-0.5 bg-slate-800 rounded" />
          На самом деле
        </span>
        <span className="flex items-center gap-1.5 text-slate-400">
          <span className="inline-block w-6 border-t-2 border-dashed border-slate-400" />
          Как нам кажется
        </span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={data}
          margin={{ top: 12, right: 16, bottom: 8, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="n"
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

          {/* Точка текущего N — крупная, движется со слайдером */}
          {currentReal && (
            <ReferenceDot
              x={input.neighbors}
              y={currentReal.real}
              r={7}
              fill="#2563eb"
              stroke="white"
              strokeWidth={2}
              label={{
                value: `${currentReal.real}%`,
                position: input.neighbors > 40 ? "left" : "right",
                fontSize: 12,
                fontWeight: 600,
                fill: "#2563eb",
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
