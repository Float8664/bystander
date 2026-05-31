import { Suspense } from "react"
import Calculator from "./components/Calculator"

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="max-w-2xl mx-auto space-y-10">

        <div className="text-center space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-slate-400">
            Образовательный инструмент
          </p>
          <h1 className="text-4xl font-bold text-slate-900 leading-tight">
            Эффект свидетеля
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Если у тебя за стеной 20 соседей — велик ли шанс, что хоть кто-то
            среагирует на шум или крик? Прикинь интуитивно и проверь.
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-slate-400">Загрузка…</div>}>
          <Calculator />
        </Suspense>

        <footer className="text-center text-xs text-slate-300">
          Только для образовательных целей · не является эмпирически валидированным прогнозом
        </footer>

      </div>
    </main>
  )
}
