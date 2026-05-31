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
} from './constants'
import type { ScenarioInput, ModelResult } from './types'

const clamp = (v: number): number => Math.max(0, Math.min(1, v))

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
    // Остальные N−1 соседей — как обычно (с диффузией).
    // Формула: 1 − (1 − p_addr) × (1 − p_regular)^(N−1)
    const pAddr    = clamp(applyModifiers(input) * (
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
  // В адресном режиме pIndividual = шанс адресата (без диффузии)
  const pInd = input.addressed
    ? clamp(applyModifiers(input))
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
