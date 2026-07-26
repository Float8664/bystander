export default function Explanation() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm space-y-3 text-slate-600 text-sm leading-relaxed">
      <p>
        <span className="font-medium text-emerald-700">Пунктирная линия — твоя догадка:</span>{" "}
        то, сколько ты сам ожидал от соседей, прежде чем увидел расчёт.
      </p>
      <p>
        <span className="font-medium text-slate-800">Сплошная линия — «на самом деле»:</span>{" "}
        каждый думает «разберётся кто-то другой» — и чем больше соседей,
        тем сильнее размывается ответственность. Шанс не растёт с числом
        соседей, а падает. Расстояние между твоей догадкой и кривой и показывает,
        насколько <strong>эффект свидетеля</strong> расходится с интуицией.
      </p>
      <p className="text-slate-400 text-xs">
        Феномен описан в классическом исследовании:{" "}
        <a
          href="https://psycnet.apa.org/record/1968-08862-001"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-slate-600 transition-colors"
        >
          Darley &amp; Latané, 1968
        </a>
        . Числа в этом калькуляторе — иллюстративные, не эмпирический прогноз.
      </p>
    </div>
  )
}
