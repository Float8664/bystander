export type BuildingType = 'khrushchevka' | 'panel' | 'elite' | 'private'
export type Position = 'corner' | 'middle'

// Охват свидетелей: какой круг соседей в принципе может что-то заметить.
// Это ступень «охвата» (см. docs/model-rationale.md), отдельная от вероятности реакции.
export type WitnessScope = 'whole_building' | 'my_entrance' | 'my_floor_plus_adjacent'

// Физическая форма дома. Из неё ВЫВОДИТСЯ число соседей-свидетелей N
// (см. computeWitnessCount), а не вводится напрямую.
// Для частного дома N задаётся через neighboringHouses (остальные поля — заглушки).
export interface BuildingShape {
  apartmentsPerFloor: number
  floors: number
  entrances: number
  witnessScope: WitnessScope
  neighboringHouses?: number // только частный дом: N = это значение напрямую
}
export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'
export type Severity = 'minor' | 'moderate' | 'serious'
export type CulturalContext = 'high_solidarity' | 'mixed' | 'low_solidarity'

export interface ScenarioInput {
  neighbors: number
  position: Position
  buildingType: BuildingType
  timeOfDay: TimeOfDay
  severity: Severity
  culturalContext: CulturalContext
  acquaintance: boolean  // true = соседи знают друг друга, false = незнакомцы
  addressed: boolean     // true = обращаюсь к конкретному человеку, false = зову в пустоту
}

export interface ModelResult {
  pIndividual: number
  pAtLeastOne: number
  // расширяемо: interpretationBand, contributions — добавим позже
}
