import crypto from "crypto";
import QRCode from "qrcode";
import { env } from "@/lib/env";

/**
 * Genera un token QR criptográfico no predecible y su firma HMAC-SHA256
 * para garantizar autenticidad e imposibilitar falsificaciones o escaneos apócrifos.
 */
export function generateAccreditationToken(
  paramsOrEventId: { eventId: string; participantId: string } | string,
  maybeParticipantId?: string
): { qrToken: string; qrSignature: string; qrPayload: string } {
  let eventId: string;
  let participantId: string;

  if (typeof paramsOrEventId === "string") {
    eventId = paramsOrEventId;
    participantId = maybeParticipantId || "";
  } else {
    eventId = paramsOrEventId.eventId;
    participantId = paramsOrEventId.participantId;
  }

  // 1. Token criptográfico no predecible de 32 caracteres hexadecimales
  const randomPart = crypto.randomBytes(16).toString("hex");
  const qrToken = `vj_${eventId.slice(-4)}_${randomPart}`;

  // 2. Firma HMAC-SHA256 ligada al evento y participante
  const hmac = crypto.createHmac("sha256", env.JWT_SECRET);
  hmac.update(`${qrToken}:${eventId}:${participantId}`);
  const qrSignature = hmac.digest("hex").slice(0, 32);

  // 3. Payload codificado para el código QR
  const qrPayload = JSON.stringify({
    v: 1, // Versión de protocolo
    t: qrToken,
    s: qrSignature,
    e: eventId,
  });

  return { qrToken, qrSignature, qrPayload };
}

/**
 * Valida la firma criptográfica HMAC-SHA256 de un token QR.
 * Soporta llamadas con objeto o con parámetros posicionales.
 */
export function verifyAccreditationSignature(
  paramsOrToken:
    | { qrToken: string; qrSignature: string; eventId: string; participantId: string }
    | string,
  maybeEventId?: string,
  maybeParticipantId?: string,
  maybeSignature?: string
): boolean {
  let qrToken: string;
  let qrSignature: string;
  let eventId: string;
  let participantId: string;

  if (typeof paramsOrToken === "string") {
    qrToken = paramsOrToken;
    eventId = maybeEventId || "";
    participantId = maybeParticipantId || "";
    qrSignature = maybeSignature || "";
  } else {
    qrToken = paramsOrToken.qrToken;
    qrSignature = paramsOrToken.qrSignature;
    eventId = paramsOrToken.eventId;
    participantId = paramsOrToken.participantId;
  }

  try {
    const hmac = crypto.createHmac("sha256", env.JWT_SECRET);
    hmac.update(`${qrToken}:${eventId}:${participantId}`);
    const expectedSignature = hmac.digest("hex").slice(0, 32);

    const sigBuf = Buffer.from(qrSignature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Genera una imagen Data URL en alta resolución (PNG en base64) para el código QR
 */
export async function generateAccreditationQrDataUrl(
  payload: string,
  options?: { colorDark?: string; colorLight?: string; width?: number }
): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "H", // Alta redundancia (30% de daño soportado)
    margin: 2,
    width: options?.width || 400,
    color: {
      dark: options?.colorDark || "#080F1F",
      light: options?.colorLight || "#FFFFFF",
    },
  });
}

/**
 * Formatea un número correlativo legible para impresión de credencial (ej: EVT-VIP-0042 o EVT-0042)
 */
export function formatCodeNumber(
  eventPrefix: string,
  categoryOrNumber: string | number,
  maybeNumberOrDigits: number = 1,
  maybeDigits = 4
): string {
  if (typeof categoryOrNumber === "string") {
    const cleanEvent = (eventPrefix || "EVT").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const cleanCat = (categoryOrNumber || "GEN").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const num = typeof maybeNumberOrDigits === "number" ? maybeNumberOrDigits : 1;
    const padded = String(num).padStart(maybeDigits, "0");
    return `${cleanEvent}-${cleanCat}-${padded}`;
  } else {
    const cleanPrefix = (eventPrefix || "ACR").toUpperCase().replace(/[^A-Z0-9]/g, "");
    const num = categoryOrNumber;
    const digits = typeof maybeNumberOrDigits === "number" ? maybeNumberOrDigits : 4;
    const padded = String(num).padStart(digits, "0");
    return `${cleanPrefix}-${padded}`;
  }
}
