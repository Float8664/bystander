import {
  BASE_P,
  DIFFUSION_K,
  ACQUAINTANCE_FACTOR,
  ADDRESSED_DIFFUSION_REMOVAL,
  MODIFIER_SEVERITY,
  MODIFIER_TIME_OF_DAY,
  MODIFIER_BUILDING_TYPE,
  MODIFIER_POSITION,
  MODIFIER_CULTURAL_CONTEXT,
  ADJACENT_FLOORS_SPAN,
  POSITION_REACH_FACTOR,
} from './constants'
import type { ScenarioInput, ModelResult, BuildingShape, Position } from './types'

const clamp = (v: number): number => Math.max(0, Math.min(1, v))

/**
 * Число соседей-свидетелей N, выведенное из формы дома.
 * Чистая функция: возвращает целое N ≥ 0. Потолка нет — большой ЖК с охватом
 * на весь дом честно даёт сотни свидетелей. Результат N идёт дальше в
 * pIndividual/pAtLeastOne БЕЗ изменения их логики.
 *
 * Ступень «охвата» (см. docs/model-rationale.md): сколько соседей в принципе
 * в позиции что-то заметить. Это НЕ вероятность реакции.
 */
export function computeWitnessCount(shape: BuildingShape, position: Position): number {
  // Частный дом: N задаётся напрямую числом соседних домов, форма не используется.
  if (shape.neighboringHouses !== undefined) {
    return Math.max(0, Math.round(shape.neighboringHouses))
  }

  const perEntrance = shape.apartmentsPerFloor * shape.floors // квартир в одном подъезде

  let reach: number
  switch (shape.witnessScope) {
    case 'whole_building':
      reach = perEntrance * shape.entrances // весь дом
      break
    case 'my_entrance':
      reach = perEntrance // только мой подъезд (число подъездов не влияет)
      break
    case 'my_floor_plus_adjacent':
      // мой этаж + соседние сверху/снизу, но не больше, чем этажей в доме
      reach = shape.apartmentsPerFloor * Math.min(shape.floors, ADJACENT_FLOORS_SPAN)
      break
  }

  // −1: своя квартира не считается свидетелем.
  // Множитель позиции сужает охват угловой квартиры (меньше смежных соседей).
  const n = (reach - 1) * POSITION_REACH_FACTOR[position]
  return Math.max(0, Math.round(n))
}

/** BASE_P × произведение всех модификаторов для данного контекста */
export function applyModifiers(input: ScenarioInput): number {
  const product =
    MODIFIER_SEVERITY[input.severity] *
    MODIFIER_TIME_OF_DAY[input.timeOfDay] *
    MODIFIER_BUILDING_TYPE[input.buildingType] *
    MODIFIER_POSITION[input.position] *
    MODIFIER_CULTURAL_CONTEXT[input.culturalContext]

  return clamp(BASE_P * product)
}

/** Коэффициент затухания ответственности при N свидетелях. При N=1 равен 1. */
export function diffusion(n: number): number {
  if (n <= 1) return 1
  return 1 / Math.pow(n, DIFFUSION_K)
}

/** Вероятность реакции одного конкретного свидетеля с учётом диффузии и знакомства */
export function pIndividual(input: ScenarioInput): number {
  const pContext = applyModifiers(input)
  const factor = input.acquaintance ? ACQUAINTANCE_FACTOR : 1
  return clamp(pContext * diffusion(input.neighbors) * factor)
}

/** Вероятность того, что хотя бы один из N свидетелей среагирует */
export function pAtLeastOne(input: ScenarioInput): number {
  const n = input.neighbors
  if (n === 0) return 0

  if (input.addressed) {
    // Адресный режим: один конкретный адресат почти не подвержен диффузии.
    // p_addressee = p_context (ADDRESSED_DIFFUSION_REMOVAL=1.0 → диффузия снята полностью).
    // Позиция квартиры (угловая/средняя) — это фактор ОХВАТА/слышимости: сколько
    // соседей вообще что-то заметят. К адресату он не применяется: ты обращаешься
    // к нему напрямую, общие стены и слышимость тут ни при чём. Поэтому шанс
    // адресата считаем с нейтральной позицией ('middle' = 1.0), без охвата.
    // Остальные N−1 соседей — как обычно (с диффузией и со своей позицией).
    // Формула: 1 − (1 − p_addr) × (1 − p_regular)^(N−1)
    const pAddr    = clamp(applyModifiers({ ...input, position: 'middle' }) * (
      ADDRESSED_DIFFUSION_REMOVAL + (1 - ADDRESSED_DIFFUSION_REMOVAL) * diffusion(n)
    ))
    if (n === 1) return pAddr
    const pRegular = pIndividual(input)
    return clamp(1 - (1 - pAddr) * Math.pow(1 - pRegular, n - 1))
  }

  const pInd = pIndividual(input)
  return clamp(1 - Math.pow(1 - pInd, n))
}

/** Главная функция: возвращает ModelResult для заданного сценария */
export function computeResult(input: ScenarioInput): ModelResult {
  // В адресном режиме pIndividual = шанс адресата (без диффузии и без фактора
  // охвата — позиция к адресату не применяется, см. pAtLeastOne).
  const pInd = input.addressed
    ? clamp(applyModifiers({ ...input, position: 'middle' }))
    : pIndividual(input)
  return {
    pIndividual: pInd,
    pAtLeastOne: pAtLeastOne(input),
  }
}

/**
 * «Наивное ожидание»: p_инд не убывает с ростом N (диффузии нет).
 * Иллюстрирует интуицию «больше людей — точно кто-то поможет».
 * Возвращает P(хотя бы один) при фиксированном p_context независимо от N.
 */
export function computeNaive(input: ScenarioInput): ModelResult {
  const n = input.neighbors
  if (n === 0) return { pIndividual: 0, pAtLeastOne: 0 }
  const pContext = applyModifiers(input)
  const pAny = clamp(1 - Math.pow(1 - pContext, n))
  return { pIndividual: pContext, pAtLeastOne: pAny }
}
