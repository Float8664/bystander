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
  Legend,
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

  const currentReal  = data[input.neighbors - 1]

  return (
    <div
      role="img"
      aria-label={`График зависимости вероятности от числа соседей. При N=${input.neighbors}: реальная ${currentReal?.real}%, наивная ${data[input.neighbors - 1]?.naive}%.`}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <h2 className="text-sm font-medium uppercase tracking-widest text-slate-400 mb-6">
        Зависимость P(хотя бы один) от числа соседей
      </h2>
      <ResponsiveContainer width="100%" height={280}>
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
            formatter={(value, name) => [
              typeof value === "number" ? `${value}%` : "—",
              name === "real"
                ? "Реальность (диффузия ответственности)"
                : "Наивное ожидание",
            ]}
            labelFormatter={(n) => `N = ${n}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
          />
          <Legend
            formatter={(value) =>
              value === "real"
                ? "Реальность (диффузия ответственности)"
                : "Наивное ожидание"
            }
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />

          {/* Пунктирная — наивное ожидание */}
          <Line
            type="monotone"
            dataKey="naive"
            stroke="#94a3b8"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 3, fill: "#94a3b8" }}
          />

          {/* Сплошная — реальность с диффузией */}
          <Line
            type="monotone"
            dataKey="real"
            stroke="#1e293b"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#1e293b" }}
          />

          {/* Точка текущего N на реальной кривой */}
          {currentReal && (
            <ReferenceDot
              x={input.neighbors}
              y={currentReal.real}
              r={6}
              fill="#1e293b"
              stroke="white"
              strokeWidth={2}
              label={{
                value: `N=${input.neighbors}`,
                position: input.neighbors > 40 ? "left" : "right",
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
