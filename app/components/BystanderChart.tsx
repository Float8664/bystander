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
import { computeResult } from "@/src/lib/model/probability"
import type { ScenarioInput } from "@/src/lib/model/types"

interface Props {
  input: ScenarioInput
}

export default function BystanderChart({ input }: Props) {
  // Строим кривую: для каждого N от 1 до 50 вызываем computeResult из модели.
  // Формул здесь нет — только вызовы модели.
  const data = useMemo(() => {
    return Array.from({ length: 50 }, (_, i) => {
      const n = i + 1
      const result = computeResult({ ...input, neighbors: n })
      return {
        n,
        pAtLeastOne: Math.round(result.pAtLeastOne * 1000) / 10, // в процентах, 1 знак
      }
    })
  }, [
    // Кривая зависит от всех параметров кроме neighbors
    input.severity,
    input.timeOfDay,
    input.buildingType,
    input.position,
    input.culturalContext,
  ])

  // Точка текущего N
  const currentPoint = data[input.neighbors - 1]

  return (
    <div
      role="img"
      aria-label={`График зависимости вероятности реакции от числа соседей. При N=${input.neighbors} вероятность ${currentPoint?.pAtLeastOne}%.`}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400 mb-6">
        Зависимость P(хотя бы один) от числа соседей
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="n"
            label={{ value: "Число соседей (N)", position: "insideBottom", offset: -4, fontSize: 12, fill: "#94a3b8" }}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            height={48}
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
            formatter={(value: number) => [`${value}%`, "P(хотя бы один)"]}
            labelFormatter={(n) => `N = ${n}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <Line
            type="monotone"
            dataKey="pAtLeastOne"
            stroke="#1e293b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#1e293b" }}
          />
          {currentPoint && (
            <ReferenceDot
              x={input.neighbors}
              y={currentPoint.pAtLeastOne}
              r={6}
              fill="#1e293b"
              stroke="white"
              strokeWidth={2}
              label={{
                value: `N=${input.neighbors}`,
                position: input.neighbors > 80 ? "left" : "right",
                fontSize: 11,
                fill: "#475569",
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
