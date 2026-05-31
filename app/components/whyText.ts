import type { ScenarioInput } from "@/src/lib/model/types"

/**
 * Возвращает 1–2 человеческие фразы, объясняющие, почему текущие параметры
 * дают такой результат. Никакой математики — только словарный lookup.
 */
export function getWhyText(input: ScenarioInput): string {
  const parts: string[] = []

  // Тип дома
  const buildingText: Record<ScenarioInput["buildingType"], string> = {
    khrushchevka: "В хрущёвке тонкие стены и все на виду — соседи чаще замечают.",
    panel:        "Панельный дом: средняя слышимость, соседи почти не знают друг друга.",
    elite:        "В элитном ЖК толстые стены и больше анонимности — замечают реже.",
    private:      "В частном доме соседи знают друг друга — охотнее вмешиваются.",
  }
  parts.push(buildingText[input.buildingType])

  // Время суток
  const timeText: Record<ScenarioInput["timeOfDay"], string | null> = {
    morning: null,
    day:     null,
    evening: "Вечером меньше активных свидетелей.",
    night:   "Ночью большинство спят или не хотят открывать дверь.",
  }
  const t = timeText[input.timeOfDay]
  if (t) parts.push(t)

  // Серьёзность
  const severityText: Record<ScenarioInput["severity"], string | null> = {
    minor:    "Незначительная ситуация — многие решают не вмешиваться.",
    moderate: null,
    serious:  "Серьёзная ситуация — сложнее проигнорировать.",
  }
  const s = severityText[input.severity]
  if (s) parts.push(s)

  // Культурный контекст
  const culturalText: Record<ScenarioInput["culturalContext"], string | null> = {
    high_solidarity: "В сплочённой среде охотнее вмешиваются в чужие дела.",
    mixed:           null,
    low_solidarity:  "Там, где не принято вмешиваться, каждый предпочитает не высовываться.",
  }
  const c = culturalText[input.culturalContext]
  if (c) parts.push(c)

  // Позиция — добавляем только для угловой
  if (input.position === "corner") {
    parts.push("Угловая квартира — меньше общих стен, меньше слышно соседей.")
  }

  // Знакомство — ставим первым, если включено (важный фактор)
  if (input.acquaintance) {
    parts.unshift("Соседи знакомы — труднее остаться в стороне, когда знаешь человека лично.")
  }

  // Адресное обращение — перебивает всё, стоит первым
  if (input.addressed) {
    parts.unshift("Ты обратился к конкретному человеку — ему труднее переложить ответственность на других.")
  }

  // Возвращаем не более 2 самых важных фраз
  return parts.slice(0, 2).join(" ")
}
