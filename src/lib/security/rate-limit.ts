import { NextRequest } from "next/server";

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// Almacén en memoria de límites por clave
const rateLimitStore = new Map<string, RateLimitRecord>();

// Limpieza automática periódica para evitar fugas de memoria
const CLEANUP_INTERVAL_MS = 60 * 1000; // cada 60 segundos
let cleanupTimer: NodeJS.Timeout | null = null;

function ensureCleanupTimer() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (record.resetAt <= now) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Permitir que el proceso termine limpiamente si no hay otras tareas
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
}

/**
 * Verifica si una clave excede el límite de solicitudes en una ventana de tiempo.
 * Algoritmo: Contador de ventana fija / reseteo dinámico.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  ensureCleanupTimer();
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || record.resetAt <= now) {
    // Primera petición en una nueva ventana
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });

    return {
      success: true,
      limit,
      remaining: Math.max(0, limit - 1),
      resetMs: windowMs,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  // Ventana existente
  record.count += 1;
  const remainingTimeMs = Math.max(0, record.resetAt - now);
  const retryAfterSeconds = Math.ceil(remainingTimeMs / 1000);

  if (record.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs: remainingTimeMs,
      retryAfterSeconds,
    };
  }

  return {
    success: true,
    limit,
    remaining: Math.max(0, limit - record.count),
    resetMs: remainingTimeMs,
    retryAfterSeconds,
  };
}

/**
 * Obtiene la dirección IP del cliente desde los encabezados estándar de proxy inverso (Vercel, Cloudflare, Nginx).
 */
export function getClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Puede contener múltiples IPs separadas por coma: client, proxy1, proxy2
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();

  return "127.0.0.1";
}
