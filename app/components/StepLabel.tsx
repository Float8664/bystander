/**
 * Надзаголовок шага: «ШАГ 1 — ТВОЯ ДОГАДКА» и т.д.
 * Вынесен в один компонент, чтобы все три шага выглядели одинаково
 * и сюжет читался с первого взгляда.
 */
export default function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
      {children}
    </p>
  )
}
