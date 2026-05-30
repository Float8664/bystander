export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-6">
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">
          Образовательный инструмент
        </p>
        <h1 className="text-4xl font-bold text-slate-900 leading-tight">
          Эффект свидетеля
        </h1>
        <p className="text-lg text-slate-600 leading-relaxed">
          Интерактивный калькулятор, иллюстрирующий диффузию ответственности
          (Darley &amp; Latané, 1968) на примере многоквартирных домов.
        </p>
        <p className="text-sm text-slate-400 italic">
          Калькулятор в разработке — скоро здесь.
        </p>
      </div>
      <footer className="absolute bottom-6 text-xs text-slate-300">
        Только для образовательных целей · не является эмпирически валидированным прогнозом
      </footer>
    </main>
  );
}
