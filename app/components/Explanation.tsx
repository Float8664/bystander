export default function Explanation() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm space-y-3 text-slate-600 text-sm leading-relaxed">
      <p>
        Посмотрите на сплошную линию: чем больше соседей, тем <em>ниже</em> шанс,
        что хотя бы один из них среагирует. Это кажется нелогичным.
      </p>
      <p>
        Интуиция подсказывает: чем больше людей рядом, тем вернее кто-то поможет —
        именно это показывает пунктирная линия. Но на деле каждый думает
        «кто-то другой разберётся», и ответственность растворяется между всеми.
        Чем больше свидетелей, тем меньше каждый чувствует себя лично обязанным.
        Это и есть <strong>эффект свидетеля</strong>.
      </p>
      <p className="text-slate-400 text-xs">
        Сам феномен описан в классическом исследовании:{" "}
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
