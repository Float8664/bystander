interface HintProps {
  text: string
}

/**
 * Иконка «?» с всплывающей подсказкой при наведении.
 * CSS-only, без зависимостей.
 */
export default function Hint({ text }: HintProps) {
  return (
    <span className="relative inline-block align-middle ml-1 group">
      <span
        aria-label={`Подсказка: ${text}`}
        role="tooltip"
        className="
          inline-flex items-center justify-center
          w-4 h-4 rounded-full border border-slate-300
          text-slate-400 text-[10px] font-bold
          cursor-default select-none
          hover:border-slate-500 hover:text-slate-600
          transition-colors
        "
      >
        ?
      </span>
      <span
        aria-hidden="true"
        className="
          pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-10
          w-56 rounded-lg bg-slate-800 px-3 py-2
          text-xs text-slate-100 leading-relaxed
          opacity-0 group-hover:opacity-100
          transition-opacity duration-150
          shadow-lg
        "
      >
        {text}
        {/* Стрелочка вниз */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
      </span>
    </span>
  )
}
