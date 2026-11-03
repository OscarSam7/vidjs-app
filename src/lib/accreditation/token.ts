import crypto from "crypto";
import QRCode from "qrcode";
import { env } from "@/lib/env";

/**
 * Genera un token QR criptográfico no predecible y su firma HMAC-SHA256
 * para garantizar autenticidad e imposibilitar falsificaciones o escaneos apócrifos.
 */
export function generateAccreditationToken(params: {
  eventId: string;
  participantId: string;
}): { qrToken: string; qrSignature: string; qrPayload: string } {
  const { eventId, participantId } = params;

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
 * Valida la firma criptográfica HMAC-SHA256 de un token QR
 */
export function verifyAccreditationSignature(params: {
  qrToken: string;
  qrSignature: string;
  eventId: string;
  participantId: string;
}): boolean {
  const { qrToken, qrSignature, eventId, participantId } = params;
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
 * Formatea un número correlativo legible para impresión de credencial (ej: EVT-VIP-0042)
 */
export function formatCodeNumber(prefix: string, number: number, digits = 4): string {
  const cleanPrefix = (prefix || "ACR").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const padded = String(number).padStart(digits, "0");
  return `${cleanPrefix}-${padded}`;
}
