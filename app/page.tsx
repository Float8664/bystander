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
            Если у тебя за стеной целый подъезд соседей — велик ли шанс,
            что хоть кто-то среагирует на шум или крик? Сначала назови своё число,
            потом сравни с расчётом.
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-slate-400">Загрузка…</div>}>
          <Calculator />
        </Suspense>

        <div className="text-center">
          <a
            href="https://forms.gle/3DksDqEEK6qyrvUi8"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-slate-400 underline underline-offset-2 hover:text-slate-600
              focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500"
          >
            Расскажи, что непонятно — оставить отзыв
          </a>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5 text-sm text-slate-600 leading-relaxed">
          <div className="space-y-1.5">
            <p className="font-medium text-slate-700">Если слышишь у соседей что-то похожее на насилие</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                Звони{" "}
                <a href="tel:112" className="font-medium text-slate-800 underline underline-offset-2 hover:text-slate-900">
                  112
                </a>{" "}
                — единый экстренный номер.
              </li>
              <li>Если это безопасно — можно записать происходящее на телефон.</li>
              <li>Не оставайся молчаливым свидетелем.</li>
            </ul>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-5">
            <p className="font-medium text-slate-700">Если помощь нужна тебе или близкому</p>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <a href="tel:112" className="font-medium text-slate-800 underline underline-offset-2 hover:text-slate-900">
                  112
                </a>{" "}
                — экстренная помощь, круглосуточно.
              </li>
              <li>
                <a href="tel:88007000600" className="font-medium text-slate-800 underline underline-offset-2 hover:text-slate-900">
                  8&nbsp;800&nbsp;7000&nbsp;600
                </a>{" "}
                — телефон доверия для пострадавших от насилия, круглосуточно.
              </li>
              <li>
                Раздел помощи на портале{" "}
                <a
                  href="https://www.gosuslugi.ru/domestic_abuse"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2 text-slate-700 hover:text-slate-900"
                >
                  Госуслуги
                </a>{" "}
                — актуальные горячие линии и карта кризисных центров.
              </li>
            </ul>
          </div>
        </div>

        <footer className="text-center text-xs text-slate-300">
          Только для образовательных целей · не является эмпирически валидированным прогнозом
        </footer>

      </div>
    </main>
  )
}
