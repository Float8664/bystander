import { describe, it, expect } from 'vitest'
import {
  applyModifiers,
  pIndividual,
  pAtLeastOne,
  computeResult,
  computeNaive,
} from '../probability'
import type { ScenarioInput } from '../types'

const base: ScenarioInput = {
  neighbors: 5,
  position: 'middle',
  buildingType: 'panel',
  timeOfDay: 'day',
  severity: 'moderate',
  culturalContext: 'mixed',
}

// ─── Инварианты диапазона ───────────────────────────────────────────────────

describe('range invariants', () => {
  const variants: ScenarioInput[] = [
    base,
    { ...base, neighbors: 0 },
    { ...base, neighbors: 1 },
    { ...base, neighbors: 100 },
    { ...base, severity: 'serious', timeOfDay: 'night', culturalContext: 'low_solidarity' },
    { ...base, severity: 'minor', buildingType: 'elite', position: 'corner' },
  ]

  it.each(variants)('pIndividual in [0,1]', (input) => {
    expect(pIndividual(input)).toBeGreaterThanOrEqual(0)
    expect(pIndividual(input)).toBeLessThanOrEqual(1)
  })

  it.each(variants)('pAtLeastOne in [0,1]', (input) => {
    expect(pAtLeastOne(input)).toBeGreaterThanOrEqual(0)
    expect(pAtLeastOne(input)).toBeLessThanOrEqual(1)
  })
})

// ─── Граничные случаи N ─────────────────────────────────────────────────────

describe('edge cases for N', () => {
  it('N=0 → pAtLeastOne = 0', () => {
    expect(pAtLeastOne({ ...base, neighbors: 0 })).toBe(0)
  })

  it('N=1 → pAtLeastOne = pIndividual = p_context (без диффузии)', () => {
    const input = { ...base, neighbors: 1 }
    const pInd = pIndividual(input)
    const pAny = pAtLeastOne(input)
    const pCtx = applyModifiers(input)
    expect(pInd).toBeCloseTo(pCtx, 10)
    expect(pAny).toBeCloseTo(pCtx, 10)
  })
})

// ─── Диффузия: pIndividual не возрастает с N ────────────────────────────────

describe('diffusion monotonicity', () => {
  it('pIndividual не возрастает при увеличении N', () => {
    const ns = [1, 2, 5, 10, 20, 50]
    const values = ns.map((n) => pIndividual({ ...base, neighbors: n }))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1])
    }
  })
})

// ─── Направления модификаторов ───────────────────────────────────────────────

describe('modifier directions', () => {
  it('serious > minor по p_context', () => {
    const serious = applyModifiers({ ...base, severity: 'serious' })
    const minor = applyModifiers({ ...base, severity: 'minor' })
    expect(serious).toBeGreaterThan(minor)
  })

  it('day > night по p_context', () => {
    const day = applyModifiers({ ...base, timeOfDay: 'day' })
    const night = applyModifiers({ ...base, timeOfDay: 'night' })
    expect(day).toBeGreaterThan(night)
  })

  it('high_solidarity > low_solidarity по p_context', () => {
    const high = applyModifiers({ ...base, culturalContext: 'high_solidarity' })
    const low = applyModifiers({ ...base, culturalContext: 'low_solidarity' })
    expect(high).toBeGreaterThan(low)
  })
})

// ─── Детерминированность ─────────────────────────────────────────────────────

describe('determinism', () => {
  it('одинаковый вход → одинаковый результат', () => {
    expect(computeResult(base)).toEqual(computeResult({ ...base }))
  })
})

// ─── Golden-тесты конкретных сценариев ──────────────────────────────────────
// Фиксируют ожидаемые значения. При изменении коэффициентов тест упадёт —
// это сигнал пересмотреть значения осознанно.

describe('golden tests', () => {
  it('нейтральный сценарий (N=5, все референсные)', () => {
    const result = computeResult(base)
    // BASE_P=0.5 * day(1.2) * остальные референсные(1.0) = 0.6, diffusion=1/5=0.2
    // pInd = 0.6 * 0.2 = 0.12, pAny = 1 - (0.88)^5
    expect(result.pIndividual).toBeCloseTo(0.12, 5)
    expect(result.pAtLeastOne).toBeCloseTo(1 - Math.pow(1 - 0.12, 5), 5)
  })

  it('высокий риск (serious, night, low_solidarity, N=20)', () => {
    const input: ScenarioInput = {
      ...base,
      neighbors: 20,
      severity: 'serious',
      timeOfDay: 'night',
      culturalContext: 'low_solidarity',
    }
    const result = computeResult(input)
    // pContext = 0.5 * 1.6 * 0.6 * 1.0 * 1.0 * 0.7 = 0.336, diffusion=1/20=0.05
    // pInd = 0.336 * 0.05 = 0.0168, pAny = 1 - (1-0.0168)^20
    expect(result.pIndividual).toBeCloseTo(0.0168, 4)
    expect(result.pAtLeastOne).toBeCloseTo(1 - Math.pow(1 - 0.0168, 20), 4)
  })

  it('благоприятный сценарий (minor, morning, high_solidarity, private, N=3)', () => {
    const input: ScenarioInput = {
      ...base,
      neighbors: 3,
      severity: 'minor',
      timeOfDay: 'morning',
      culturalContext: 'high_solidarity',
      buildingType: 'private',
    }
    const result = computeResult(input)
    // pContext = 0.5 * 0.5 * 1.1 * 1.2 * 1.0 * 1.3 = 0.429, diffusion=1/3≈0.3333
    // pInd ≈ 0.143, pAny = 1 - (1-0.143)^3
    const pCtx = 0.5 * 0.5 * 1.1 * 1.2 * 1.0 * 1.3
    const pInd = pCtx / 3
    expect(result.pIndividual).toBeCloseTo(pInd, 4)
    expect(result.pAtLeastOne).toBeCloseTo(1 - Math.pow(1 - pInd, 3), 4)
  })
})

// ─── computeNaive ────────────────────────────────────────────────────────────

describe('computeNaive', () => {
  it('pIndividual = p_context (без диффузии)', () => {
    const result = computeNaive(base)
    expect(result.pIndividual).toBeCloseTo(applyModifiers(base), 10)
  })

  it('pAtLeastOne наивный >= реального (диффузия только снижает)', () => {
    const naive = computeNaive(base)
    const real = computeResult(base)
    expect(naive.pAtLeastOne).toBeGreaterThanOrEqual(real.pAtLeastOne)
  })

  it('наивный растёт с ростом N', () => {
    const ns = [1, 5, 10, 20, 50]
    const values = ns.map((n) => computeNaive({ ...base, neighbors: n }).pAtLeastOne)
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1])
    }
  })

  it('N=0 → pAtLeastOne = 0', () => {
    expect(computeNaive({ ...base, neighbors: 0 }).pAtLeastOne).toBe(0)
  })
})
