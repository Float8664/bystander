export type BuildingType = 'khrushchevka' | 'panel' | 'elite' | 'private'
export type Position = 'corner' | 'middle'
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
}

export interface ModelResult {
  pIndividual: number
  pAtLeastOne: number
  // расширяемо: interpretationBand, contributions — добавим позже
}
