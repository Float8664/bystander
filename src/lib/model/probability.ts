import {
  BASE_P,
  DIFFUSION_K,
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

/** Вероятность реакции одного конкретного свидетеля с учётом диффузии */
export function pIndividual(input: ScenarioInput): number {
  const pContext = applyModifiers(input)
  return clamp(pContext * diffusion(input.neighbors))
}

/** Вероятность того, что хотя бы один из N свидетелей среагирует */
export function pAtLeastOne(input: ScenarioInput): number {
  const n = input.neighbors
  if (n === 0) return 0
  const pInd = pIndividual(input)
  return clamp(1 - Math.pow(1 - pInd, n))
}

/** Главная функция: возвращает ModelResult для заданного сценария */
export function computeResult(input: ScenarioInput): ModelResult {
  return {
    pIndividual: pIndividual(input),
    pAtLeastOne: pAtLeastOne(input),
  }
}
