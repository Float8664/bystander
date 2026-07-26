/**
 * Хранилище догадки пользователя поверх sessionStorage.
 *
 * Читается через useSyncExternalStore, а не в инициализаторе useState:
 * компонент рендерится и на сервере, где sessionStorage нет, и чтение
 * в инициализаторе давало null навсегда — вернувшийся пользователь снова
 * видел вопрос, хотя догадка была сохранена.
 *
 * sessionStorage, а не URL: догадка переживает перезагрузку вкладки,
 * но не уезжает в ссылку — иначе получатель увидел бы чужое предположение
 * вместо своего.
 */

const GUESS_KEY = "bystander:guess"

const listeners = new Set<() => void>()

function parse(raw: string | null): number | null {
  if (raw === null) return null
  const v = Number(raw)
  return Number.isFinite(v) && v >= 0 && v <= 100 ? Math.round(v) : null
}

// getSnapshot обязан возвращать стабильное значение при неизменных данных,
// иначе useSyncExternalStore уходит в бесконечный ре-рендер. Поэтому кэшируем
// и сбрасываем кэш только при записи.
let cache: number | null = null
let cacheValid = false

export function subscribeToGuess(onChange: () => void): () => void {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

export function getGuessSnapshot(): number | null {
  if (!cacheValid) {
    try {
      cache = parse(sessionStorage.getItem(GUESS_KEY))
    } catch {
      // Приватный режим или заблокированное хранилище — просто спросим заново.
      cache = null
    }
    cacheValid = true
  }
  return cache
}

// На сервере догадки нет — там всегда показывается вопрос.
export function getGuessServerSnapshot(): number | null {
  return null
}

export function storeGuess(value: number): void {
  cache = value
  cacheValid = true
  try {
    sessionStorage.setItem(GUESS_KEY, String(value))
  } catch {
    // Не сохранили — догадка всё равно живёт в памяти до перезагрузки.
  }
  listeners.forEach((notify) => notify())
}
