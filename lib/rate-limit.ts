/**
 * Rate limiter in-memory per API routes Next.js (Node.js runtime).
 * Usa una sliding window per IP. Nessuna dipendenza esterna.
 *
 * Limitazioni: il contatore si azzera al restart del server (Vercel cold start).
 * Per produzione multi-instance usare Upstash Redis come drop-in replacement.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Pulizia automatica ogni 5 minuti per evitare memory leak
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  /** Numero massimo di richieste nella finestra temporale */
  limit: number
  /** Durata della finestra in secondi */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Verifica e incrementa il contatore per la chiave data.
 * @param key   Identificatore univoco (es. `${userId}:${route}` o `${ip}:${route}`)
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now()
  const windowMs = config.windowSeconds * 1000
  const existing = store.get(key)

  if (!existing || existing.resetAt < now) {
    // Finestra scaduta o prima richiesta
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: config.limit - 1, resetAt: now + windowMs }
  }

  if (existing.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt }
  }

  existing.count++
  return { allowed: true, remaining: config.limit - existing.count, resetAt: existing.resetAt }
}

/** Configurazioni predefinite per route critiche */
export const RATE_LIMITS = {
  /** Invio messaggi: 30 messaggi/minuto per utente */
  messaggi: { limit: 30, windowSeconds: 60 },
  /** Upload file: 10 upload/minuto per utente */
  upload: { limit: 10, windowSeconds: 60 },
  /** Invio notifiche: 5 invii/minuto per utente (operazione admin costosa) */
  notifiche: { limit: 5, windowSeconds: 60 },
} satisfies Record<string, RateLimitConfig>
