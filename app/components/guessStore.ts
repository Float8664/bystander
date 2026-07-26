/**
 * Состояние прохода пользователя поверх sessionStorage:
 *  - guess    — зафиксированная догадка в процентах (null, пока не поставлена);
 *  - revealed — результат уже раскрывали хотя бы раз. Это граница между
 *               «первым проходом» (ведём за руку) и свободным исследованием.
 *
 * Читается через useSyncExternalStore, а не в инициализаторе useState:
 * компонент рендерится и на сервере, где sessionStorage нет.
 *
 * sessionStorage, а не URL: состояние переживает перезагрузку вкладки,
 * но не уезжает в ссылку — иначе получатель увидел бы чужое предположение
 * вместо своего.
 */

const GUESS_KEY = "bystander:guess"
const REVEALED_KEY = "bystander:revealed"

const listeners = new Set<() => void>()

export interface GuessState {
  guess: number | null
  revealed: boolean
}

function parseGuess(raw: string | null): number | null {
  if (raw === null) return null
  const v = Number(raw)
  return Number.isFinite(v) && v >= 0 && v <= 100 ? Math.round(v) : null
}

// На сервере прохода нет — там всегда начало истории.
const SERVER_STATE: GuessState = { guess: null, revealed: false }

// getSnapshot обязан возвращать СТАБИЛЬНУЮ ссылку при неизменных данных,
// иначе useSyncExternalStore уходит в бесконечный ре-рендер. Поэтому держим
// объект в кэше и пересобираем его только при записи.
let cache: GuessState | null = null

function readFromStorage(): GuessState {
  try {
    return {
      guess: parseGuess(sessionStorage.getItem(GUESS_KEY)),
      revealed: sessionStorage.getItem(REVEALED_KEY) === "1",
    }
  } catch {
    // Приватный режим или заблокированное хранилище — начнём историю заново.
    return { guess: null, revealed: false }
  }
}

export function subscribeToGuess(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function getGuessSnapshot(): GuessState {
  if (cache === null) cache = readFromStorage()
  return cache
}

export function getGuessServerSnapshot(): GuessState {
  return SERVER_STATE
}

function commit(next: GuessState): void {
  cache = next
  try {
    if (next.guess === null) sessionStorage.removeItem(GUESS_KEY)
    else sessionStorage.setItem(GUESS_KEY, String(next.guess))
    if (next.revealed) sessionStorage.setItem(REVEALED_KEY, "1")
    else sessionStorage.removeItem(REVEALED_KEY)
  } catch {
    // Не сохранили — состояние всё равно живёт в памяти до перезагрузки.
  }
  listeners.forEach((notify) => notify())
}

/**
 * Зафиксировать догадку. Флаг revealed НЕ сбрасываем: если человек уже прошёл
 * первый круг и просто меняет предположение, заново вести его за руку не нужно.
 */
export function storeGuess(value: number): void {
  commit({ guess: value, revealed: getGuessSnapshot().revealed })
}

/** Отметить, что результат раскрыт — дальше свободный режим. */
export function markRevealed(): void {
  const current = getGuessSnapshot()
  if (current.revealed) return
  commit({ ...current, revealed: true })
}
