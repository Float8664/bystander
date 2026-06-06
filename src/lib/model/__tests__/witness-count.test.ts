import { describe, it, expect } from 'vitest'
import { computeWitnessCount, pAtLeastOne, computeResult } from '../probability'
import { BUILDING_DEFAULTS } from '../constants'
import type { BuildingShape, ScenarioInput } from '../types'

// Базовый сценарий для проверок, где N подставляется из computeWitnessCount.
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

// ─── Разумные N по типам дома ────────────────────────────────────────────────

describe('computeWitnessCount: разумные N по типам дома', () => {
  it('хрущёвка → небольшое N', () => {
    // perEntrance = 3×5 = 15, scope my_entrance → reach 15, минус своя = 14
    expect(computeWitnessCount(BUILDING_DEFAULTS.khrushchevka, 'middle')).toBe(14)
  })

  it('панель → среднее N', () => {
    // perEntrance = 4×9 = 36, scope my_entrance → 35
    expect(computeWitnessCount(BUILDING_DEFAULTS.panel, 'middle')).toBe(35)
  })

  it('элитный ЖК → ограничен ближними этажами (не сотни)', () => {
    // scope my_floor_plus_adjacent → 6 × min(16,3) = 18, минус своя = 17
    expect(computeWitnessCount(BUILDING_DEFAULTS.elite, 'middle')).toBe(17)
  })

  it('частный дом → N = neighboringHouses', () => {
    expect(computeWitnessCount(BUILDING_DEFAULTS.private, 'middle')).toBe(4)
  })

  it('хрущёвка < панель (больше дом — больше свидетелей)', () => {
    const k = computeWitnessCount(BUILDING_DEFAULTS.khrushchevka, 'middle')
    const p = computeWitnessCount(BUILDING_DEFAULTS.panel, 'middle')
    expect(k).toBeLessThan(p)
  })
})

// ─── Семантика witnessScope ──────────────────────────────────────────────────

describe('computeWitnessCount: witnessScope', () => {
  const shape: BuildingShape = {
    apartmentsPerFloor: 4,
    floors: 9,
    entrances: 6,
    witnessScope: 'my_entrance',
  }

  it('my_entrance < whole_building при тех же параметрах', () => {
    const entrance = computeWitnessCount({ ...shape, witnessScope: 'my_entrance' }, 'middle')
    const whole = computeWitnessCount({ ...shape, witnessScope: 'whole_building' }, 'middle')
    expect(entrance).toBeLessThan(whole)
  })

  it('my_floor_plus_adjacent ≤ my_entrance (часть подъезда)', () => {
    const floorPlus = computeWitnessCount({ ...shape, witnessScope: 'my_floor_plus_adjacent' }, 'middle')
    const entrance = computeWitnessCount({ ...shape, witnessScope: 'my_entrance' }, 'middle')
    expect(floorPlus).toBeLessThanOrEqual(entrance)
  })

  it('my_entrance не зависит от числа подъездов', () => {
    const few = computeWitnessCount({ ...shape, entrances: 1 }, 'middle')
    const many = computeWitnessCount({ ...shape, entrances: 10 }, 'middle')
    expect(few).toBe(many)
  })

  it('whole_building растёт с числом подъездов', () => {
    const few = computeWitnessCount({ ...shape, witnessScope: 'whole_building', entrances: 1 }, 'middle')
    const many = computeWitnessCount({ ...shape, witnessScope: 'whole_building', entrances: 10 }, 'middle')
    expect(many).toBeGreaterThan(few)
  })
})

// ─── Позиция квартиры сужает охват ───────────────────────────────────────────

describe('computeWitnessCount: позиция', () => {
  it('угловая → N не больше, чем средняя, при прочих равных', () => {
    for (const type of ['khrushchevka', 'panel', 'elite'] as const) {
      const corner = computeWitnessCount(BUILDING_DEFAULTS[type], 'corner')
      const middle = computeWitnessCount(BUILDING_DEFAULTS[type], 'middle')
      expect(corner).toBeLessThanOrEqual(middle)
    }
  })

  it('у частного дома позиция не меняет N (задан напрямую)', () => {
    const corner = computeWitnessCount(BUILDING_DEFAULTS.private, 'corner')
    const middle = computeWitnessCount(BUILDING_DEFAULTS.private, 'middle')
    expect(corner).toBe(middle)
  })
})

// ─── N всегда корректное целое ≥ 0 ───────────────────────────────────────────

describe('computeWitnessCount: корректность значения', () => {
  it('всегда целое неотрицательное', () => {
    const shapes: BuildingShape[] = [
      ...Object.values(BUILDING_DEFAULTS),
      { apartmentsPerFloor: 1, floors: 1, entrances: 1, witnessScope: 'my_entrance' }, // вырожденный: один в доме
      { apartmentsPerFloor: 1, floors: 1, entrances: 1, witnessScope: 'whole_building' },
      { apartmentsPerFloor: 0, floors: 0, entrances: 0, witnessScope: 'whole_building' },
    ]
    for (const shape of shapes) {
      for (const pos of ['corner', 'middle'] as const) {
        const n = computeWitnessCount(shape, pos)
        expect(Number.isInteger(n)).toBe(true)
        expect(n).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('дом из одной квартиры → 0 свидетелей', () => {
    const solo: BuildingShape = { apartmentsPerFloor: 1, floors: 1, entrances: 1, witnessScope: 'my_entrance' }
    expect(computeWitnessCount(solo, 'middle')).toBe(0)
  })
})

// ─── Эффект свидетеля СОХРАНЁН на вычисленных N ──────────────────────────────

describe('эффект свидетеля сохранён при N из computeWitnessCount', () => {
  it('pAtLeastOne убывает с ростом вычисленного N (растим этажность)', () => {
    const shapesByFloors = [1, 3, 5, 9, 16, 30].map<BuildingShape>((floors) => ({
      apartmentsPerFloor: 4,
      floors,
      entrances: 1,
      witnessScope: 'my_entrance',
    }))
    const ns = shapesByFloors.map((s) => computeWitnessCount(s, 'middle'))
    // N действительно растёт
    for (let i = 1; i < ns.length; i++) expect(ns[i]).toBeGreaterThan(ns[i - 1])
    // а pAtLeastOne — убывает (диффузия ответственности)
    const values = ns.map((n) => pAtLeastOne({ ...base, neighbors: n }))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeLessThanOrEqual(values[i - 1])
    }
  })
})

// ─── Адресный режим СОХРАНЁН на вычисленных N ────────────────────────────────

describe('адресный режим сохранён при N из computeWitnessCount', () => {
  const small = computeWitnessCount(BUILDING_DEFAULTS.khrushchevka, 'middle') // 14
  const large = computeWitnessCount(
    { apartmentsPerFloor: 10, floors: 25, entrances: 4, witnessScope: 'whole_building' },
    'middle',
  ) // сотни

  it('кривая высокая и почти ровная: малое vs большое N близки', () => {
    const atSmall = computeResult({ ...base, addressed: true, neighbors: small }).pAtLeastOne
    const atLarge = computeResult({ ...base, addressed: true, neighbors: large }).pAtLeastOne
    expect(atSmall).toBeGreaterThan(0.5) // высокая
    expect(Math.abs(atLarge - atSmall)).toBeLessThan(0.25) // почти ровная
  })

  it('почти не зависит от позиции (фактор охвата к адресату не идёт)', () => {
    const nCorner = computeWitnessCount(BUILDING_DEFAULTS.panel, 'corner')
    const nMiddle = computeWitnessCount(BUILDING_DEFAULTS.panel, 'middle')
    const corner = computeResult({ ...base, addressed: true, position: 'corner', neighbors: nCorner }).pAtLeastOne
    const middle = computeResult({ ...base, addressed: true, position: 'middle', neighbors: nMiddle }).pAtLeastOne
    expect(Math.abs(corner - middle)).toBeLessThan(0.05)
  })
})

// ─── Большие N (сотни): инварианты держатся ──────────────────────────────────

describe('большие N: инварианты [0,1]', () => {
  const huge = computeWitnessCount(
    { apartmentsPerFloor: 12, floors: 30, entrances: 5, witnessScope: 'whole_building' },
    'middle',
  )

  it('computeWitnessCount даёт сотни (потолка нет)', () => {
    expect(huge).toBeGreaterThan(200)
  })

  it('pAtLeastOne не ломается и остаётся в [0,1]', () => {
    for (const flags of [
      { addressed: false, acquaintance: false },
      { addressed: false, acquaintance: true },
      { addressed: true, acquaintance: false },
    ]) {
      const r = computeResult({ ...base, ...flags, neighbors: huge })
      expect(r.pIndividual).toBeGreaterThanOrEqual(0)
      expect(r.pIndividual).toBeLessThanOrEqual(1)
      expect(r.pAtLeastOne).toBeGreaterThanOrEqual(0)
      expect(r.pAtLeastOne).toBeLessThanOrEqual(1)
    }
  })
})
