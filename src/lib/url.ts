import { NextRequest } from "next/server";

/**
 * Valida si un host, IP o puerto corresponde a una dirección interna o inválida para el navegador.
 * Previene el error ERR_ADDRESS_INVALID (0.0.0.0) y puertos de contenedores internos (:10000 de Render).
 */
export function isInvalidHostOrOrigin(val?: string | null): boolean {
  if (!val) return true;
  const lower = val.toLowerCase();
  return (
    lower.includes("0.0.0.0") ||
    lower.includes(":10000") ||
    lower.includes("localhost:10000") ||
    lower.includes("127.0.0.1:10000")
  );
}

/**
 * Obtiene el origen público canónico (protocolo + dominio) de la aplicación,
 * resolviendo de manera transparente:
 * 1. Despliegues en Render (RENDER_EXTERNAL_URL / RENDER_EXTERNAL_HOSTNAME / RENDER_SERVICE_NAME).
 * 2. Variables de entorno públicas (NEXT_PUBLIC_APP_URL / APP_URL).
 * 3. Cabeceras estándar de proxies inversos (x-forwarded-host, x-forwarded-proto, host).
 * 4. Sanitización estricta: NUNCA retorna '0.0.0.0' ni el puerto interno ':10000' hacia el navegador.
 */
export function getRequestOrigin(
  req?: NextRequest | Request | { headers?: Headers | { get(k: string): string | null }; url?: string } | null
): string {
  // 1. Render inyecta RENDER_EXTERNAL_URL automáticamente (ej: https://vidjs-app.onrender.com)
  if (process.env.RENDER_EXTERNAL_URL) {
    const renderUrl = process.env.RENDER_EXTERNAL_URL.trim().replace(/\/$/, "");
    if (!isInvalidHostOrOrigin(renderUrl)) {
      return renderUrl;
    }
  }

  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    const hostname = process.env.RENDER_EXTERNAL_HOSTNAME.trim();
    if (!isInvalidHostOrOrigin(hostname)) {
      return `https://${hostname}`;
    }
  }

  // 2. Variables de entorno públicas configuradas
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const pub = process.env.NEXT_PUBLIC_APP_URL.trim().replace(/\/$/, "");
    if (!isInvalidHostOrOrigin(pub)) {
      return pub;
    }
  }

  if (process.env.APP_URL) {
    const app = process.env.APP_URL.trim().replace(/\/$/, "");
    if (!isInvalidHostOrOrigin(app)) {
      return app;
    }
  }

  // 3. Inspeccionar cabeceras enviadas por el proxy inverso
  const headers = req && "headers" in req ? req.headers : null;
  const rawForwardedHost = headers?.get("x-forwarded-host")?.trim();
  // El header x-forwarded-host puede ser una lista separada por comas; tomar el primero
  const forwardedHost = rawForwardedHost
    ? rawForwardedHost.split(",")[0].trim().replace(/:10000$/, "")
    : null;
  const forwardedProto = headers?.get("x-forwarded-proto")?.trim() || "https";

  if (forwardedHost && !isInvalidHostOrOrigin(forwardedHost)) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const rawHostHeader = headers?.get("host")?.trim();
  const hostHeader = rawHostHeader
    ? rawHostHeader.split(",")[0].trim().replace(/:10000$/, "")
    : null;
  if (hostHeader && !isInvalidHostOrOrigin(hostHeader)) {
    const isLocal = hostHeader.includes("localhost") || hostHeader.includes("127.0.0.1");
    const proto = headers?.get("x-forwarded-proto") || (isLocal ? "http" : "https");
    return `${proto}://${hostHeader}`;
  }

  // 4. Si viene req.url
  if (req?.url) {
    try {
      const parsed = new URL(req.url);
      let origin = parsed.origin;
      if (isInvalidHostOrOrigin(origin)) {
        if (process.env.NODE_ENV === "production" || process.env.RENDER) {
          if (process.env.RENDER_SERVICE_NAME) {
            return `https://${process.env.RENDER_SERVICE_NAME}.onrender.com`;
          }
          return "https://vidjs-app.onrender.com";
        }
        origin = origin.replace("0.0.0.0", "localhost").replace(/:10000$/, "");
        if (origin.startsWith("https://localhost")) {
          origin = origin.replace("https://", "http://");
        }
      }
      return origin;
    } catch {}
  }

  // 5. Fallback por defecto según entorno
  if (process.env.NODE_ENV === "production" || process.env.RENDER) {
    if (process.env.RENDER_SERVICE_NAME) {
      return `https://${process.env.RENDER_SERVICE_NAME}.onrender.com`;
    }
    return "https://vidjs-app.onrender.com";
  }

  return "http://localhost:3030";
}

/**
 * Sanitiza cualquier URL de redirección o enlace QR para evitar que apunte a 0.0.0.0 o al puerto interno :10000
 */
export function sanitizePublicUrl(url: string, req?: NextRequest | Request | null): string {
  if (!url) return url;

  if (url.includes("0.0.0.0") || url.includes(":10000")) {
    let origin = getRequestOrigin(req);
    if (isInvalidHostOrOrigin(origin)) {
      origin =
        process.env.NODE_ENV === "production" || process.env.RENDER
          ? "https://vidjs-app.onrender.com"
          : "http://localhost:3030";
    }
    return url
      .replace(/https?:\/\/(?:0\.0\.0\.0|localhost|127\.0\.0\.1):10000/gi, origin)
      .replace(/https?:\/\/0\.0\.0\.0(?::[0-9]+)?/gi, origin)
      .replace(/:10000(?:\/|$)/g, "/");
  }

  return url;
}
