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
  acquaintance: false,
  addressed: false,
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

// ─── acquaintance ─────────────────────────────────────────────────────────────

describe('acquaintance', () => {
  const withAcq    = { ...base, acquaintance: true }
  const withoutAcq = { ...base, acquaintance: false }

  it('при acquaintance=true pIndividual выше, чем при false (N>1)', () => {
    const input = { ...base, neighbors: 10 }
    expect(pIndividual({ ...input, acquaintance: true }))
      .toBeGreaterThan(pIndividual({ ...input, acquaintance: false }))
  })

  it('при acquaintance=true pAtLeastOne выше, чем при false', () => {
    const input = { ...base, neighbors: 10 }
    expect(computeResult({ ...input, acquaintance: true }).pAtLeastOne)
      .toBeGreaterThan(computeResult({ ...input, acquaintance: false }).pAtLeastOne)
  })

  it('при acquaintance=true pAtLeastOne убывает с ростом N', () => {
    const ns = [1, 2, 5, 10, 20, 50]
    const values = ns.map((n) => pAtLeastOne({ ...withAcq, neighbors: n }))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1])
    }
  })

  it('при N=1 acquaintance=true тоже даёт более высокий pIndividual', () => {
    // Мультипликативный фактор действует при любом N
    const a = pIndividual({ ...base, neighbors: 1, acquaintance: true })
    const b = pIndividual({ ...base, neighbors: 1, acquaintance: false })
    expect(a).toBeGreaterThan(b)
  })

  it('инварианты [0,1] при acquaintance=true', () => {
    for (const n of [1, 5, 10, 50]) {
      const r = computeResult({ ...withAcq, neighbors: n })
      expect(r.pIndividual).toBeGreaterThanOrEqual(0)
      expect(r.pIndividual).toBeLessThanOrEqual(1)
      expect(r.pAtLeastOne).toBeGreaterThanOrEqual(0)
      expect(r.pAtLeastOne).toBeLessThanOrEqual(1)
    }
  })
})

// ─── addressed ───────────────────────────────────────────────────────────────

describe('addressed', () => {
  const withAddr    = { ...base, addressed: true }
  const withoutAddr = { ...base, addressed: false }

  it('addressed=false даёт ровно те же результаты, что прежде (ничего не сломалось)', () => {
    const ns = [1, 5, 10, 50]
    for (const n of ns) {
      const a = computeResult({ ...withoutAddr, neighbors: n })
      const b = computeResult({ ...base, neighbors: n })
      expect(a.pIndividual).toBeCloseTo(b.pIndividual, 10)
      expect(a.pAtLeastOne).toBeCloseTo(b.pAtLeastOne, 10)
    }
  })

  it('при addressed=true pAtLeastOne заметно выше, чем при false', () => {
    const input = { ...base, neighbors: 10 }
    const addr    = computeResult({ ...input, addressed: true })
    const noAddr  = computeResult({ ...input, addressed: false })
    expect(addr.pAtLeastOne).toBeGreaterThan(noAddr.pAtLeastOne + 0.1)
  })

  it('при addressed=true и N=1: pAtLeastOne = шанс адресата (≈ p_context)', () => {
    const input = { ...base, neighbors: 1, addressed: true }
    const result = computeResult(input)
    const pCtx = applyModifiers(input)
    expect(result.pAtLeastOne).toBeCloseTo(pCtx, 5)
  })

  it('при addressed=true кривая почти ровная: pAtLeastOne при N=2 и N=50 близки', () => {
    const atN2  = computeResult({ ...withAddr, neighbors: 2  }).pAtLeastOne
    const atN50 = computeResult({ ...withAddr, neighbors: 50 }).pAtLeastOne
    // Разница < 0.25 — кривая не обваливается, в отличие от неадресного режима
    expect(Math.abs(atN50 - atN2)).toBeLessThan(0.25)
  })

  it('при addressed=false кривая обваливается: N=2 vs N=50 разница большая', () => {
    const atN2  = computeResult({ ...withoutAddr, neighbors: 2  }).pAtLeastOne
    const atN50 = computeResult({ ...withoutAddr, neighbors: 50 }).pAtLeastOne
    // В неадресном режиме кривая падает заметно
    expect(atN2 - atN50).toBeGreaterThan(0.05)
  })

  it('инварианты [0,1] при addressed=true', () => {
    for (const n of [1, 2, 5, 10, 50]) {
      const r = computeResult({ ...withAddr, neighbors: n })
      expect(r.pIndividual).toBeGreaterThanOrEqual(0)
      expect(r.pIndividual).toBeLessThanOrEqual(1)
      expect(r.pAtLeastOne).toBeGreaterThanOrEqual(0)
      expect(r.pAtLeastOne).toBeLessThanOrEqual(1)
    }
  })

  it('при addressed=true и N=1 позиция (угловая/средняя) НЕ влияет на итог', () => {
    // Адресат один, фактор охвата к нему не применяется — corner и middle совпадают.
    const corner = computeResult({ ...withAddr, neighbors: 1, position: 'corner' })
    const middle = computeResult({ ...withAddr, neighbors: 1, position: 'middle' })
    expect(corner.pAtLeastOne).toBeCloseTo(middle.pAtLeastOne, 10)
    expect(corner.pIndividual).toBeCloseTo(middle.pIndividual, 10)
  })

  it('при addressed=true позиция влияет лишь слабо (остаётся через N−1 соседей)', () => {
    // При N>1 позиция всё ещё влияет на N−1 обычных соседей, но вклад адресата
    // доминирует — итог меняется незначительно (в отличие от неадресного режима).
    const n = 10
    const corner = computeResult({ ...withAddr, neighbors: n, position: 'corner' }).pAtLeastOne
    const middle = computeResult({ ...withAddr, neighbors: n, position: 'middle' }).pAtLeastOne
    expect(Math.abs(corner - middle)).toBeLessThan(0.05)
  })

  it('в неадресном режиме позиция, наоборот, влияет заметно (контроль)', () => {
    // Подтверждаем, что фактор охвата вообще работает — просто к адресату он не идёт.
    const n = 10
    const corner = computeResult({ ...withoutAddr, neighbors: n, position: 'corner' }).pAtLeastOne
    const middle = computeResult({ ...withoutAddr, neighbors: n, position: 'middle' }).pAtLeastOne
    expect(middle).toBeGreaterThan(corner)
  })
})
