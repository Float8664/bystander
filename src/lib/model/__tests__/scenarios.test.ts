import { describe, it } from 'vitest'
import { computeResult } from '../probability'
import type { ScenarioInput } from '../types'

const scenarios: { label: string; input: ScenarioInput }[] = [
  {
    label: 'Хрущёвка / 40 соседей / ночь / умеренная ситуация',
    input: {
      neighbors: 40,
      buildingType: 'khrushchevka',
      position: 'middle',
      timeOfDay: 'night',
      severity: 'moderate',
      culturalContext: 'mixed',
      acquaintance: false,
    },
  },
  {
    label: 'Элитный ЖК / 5 соседей / день / умеренная ситуация',
    input: {
      neighbors: 5,
      buildingType: 'elite',
      position: 'middle',
      timeOfDay: 'day',
      severity: 'moderate',
      culturalContext: 'mixed',
      acquaintance: false,
    },
  },
  {
    label: 'Частный дом / 3 соседа / день / серьёзное нарушение',
    input: {
      neighbors: 3,
      buildingType: 'private',
      position: 'middle',
      timeOfDay: 'day',
      severity: 'serious',
      culturalContext: 'high_solidarity',
      acquaintance: false,
    },
  },
]

describe('scenarios output', () => {
  it('print results', () => {
    for (const { label, input } of scenarios) {
      const r = computeResult(input)
      console.log(`\n${label}`)
      console.log(`  pIndividual  = ${(r.pIndividual * 100).toFixed(1)}%`)
      console.log(`  pAtLeastOne  = ${(r.pAtLeastOne * 100).toFixed(1)}%`)
    }
  })
})
