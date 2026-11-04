import { generateQrDataUrl } from "@/lib/qr/generator";

export interface AccreditationEmailData {
  recipientEmail: string;
  recipientName: string;
  eventTitle: string;
  eventCode: string;
  venueName?: string | null;
  venueAddress?: string | null;
  startsAt?: string | Date | null;
  categoryName: string;
  categoryColor: string;
  codeNumber: string;
  qrPayload: string;
  allowedZones?: string[];
  publicUrl?: string;
}

export function buildAccreditationEmailHtml(data: AccreditationEmailData, qrDataUrl: string): string {
  const primaryColor = data.categoryColor || "#8B5CF6";
  const formattedDate = data.startsAt
    ? new Date(data.startsAt).toLocaleDateString("es-PY", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Próximamente";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tu Credencial de Acceso - ${data.eventTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #09090b; color: #f4f4f5; margin: 0; padding: 24px 12px; }
    .card { max-width: 520px; margin: 0 auto; background: #18181b; border: 1px solid #27272a; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #31104b 100%); padding: 32px 24px; text-align: center; border-bottom: 2px solid ${primaryColor}; }
    .badge { display: inline-block; padding: 6px 16px; border-radius: 9999px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #ffffff; background-color: ${primaryColor}; box-shadow: 0 4px 12px ${primaryColor}66; margin-bottom: 12px; }
    .title { font-size: 24px; font-weight: 900; margin: 0 0 8px 0; color: #ffffff; }
    .subtitle { font-size: 13px; color: #a1a1aa; margin: 0; }
    .body { padding: 32px 24px; text-align: center; }
    .attendee-name { font-size: 22px; font-weight: 800; color: #fafafa; margin: 0 0 4px 0; }
    .attendee-code { font-family: monospace; font-size: 13px; color: #a1a1aa; margin: 0 0 24px 0; }
    .qr-container { background: #ffffff; padding: 16px; border-radius: 16px; display: inline-block; box-shadow: 0 10px 25px rgba(0,0,0,0.4); margin-bottom: 24px; }
    .qr-img { width: 220px; height: 220px; display: block; }
    .info-box { background: #27272a80; border: 1px solid #3f3f46; border-radius: 12px; padding: 16px; text-align: left; margin-bottom: 24px; font-size: 13px; line-height: 1.6; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; }
    .info-label { color: #a1a1aa; }
    .info-value { color: #f4f4f5; font-weight: 600; }
    .btn { display: inline-block; width: 100%; box-sizing: border-box; background: ${primaryColor}; color: #ffffff; text-decoration: none; padding: 14px 20px; border-radius: 12px; font-weight: 700; font-size: 15px; text-align: center; margin-top: 8px; }
    .footer { text-align: center; padding: 20px 24px; font-size: 11px; color: #71717a; border-top: 1px solid #27272a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">${data.categoryName}</div>
      <h1 class="title">${data.eventTitle}</h1>
      <p class="subtitle">Acreditación Oficial & Pase de Acceso</p>
    </div>
    
    <div class="body">
      <h2 class="attendee-name">${data.recipientName}</h2>
      <p class="attendee-code">ID: ${data.codeNumber}</p>
      
      <div class="qr-container">
        <img class="qr-img" src="${qrDataUrl}" alt="Código QR de Acceso" />
      </div>

      <div class="info-box">
        <div style="margin-bottom: 8px;"><strong>Detalles del Evento:</strong></div>
        <div style="color: #a1a1aa; margin-bottom: 4px;">📅 Fecha: <span style="color: #fff;">${formattedDate}</span></div>
        ${data.venueName ? `<div style="color: #a1a1aa; margin-bottom: 4px;">📍 Lugar: <span style="color: #fff;">${data.venueName}</span></div>` : ""}
        ${data.venueAddress ? `<div style="color: #a1a1aa; margin-bottom: 4px;">📌 Dirección: <span style="color: #fff;">${data.venueAddress}</span></div>` : ""}
        <div style="color: #a1a1aa; margin-top: 8px; font-size: 12px;">Presenta este código QR en pantalla o impreso al ingresar por el puesto de control.</div>
      </div>

      ${data.publicUrl ? `<a href="${data.publicUrl}" class="btn" target="_blank">Ver y Guardar Credencial Digital</a>` : ""}
    </div>

    <div class="footer">
      Sistema de Acreditación Inteligente Vidjs Pro &bull; No compartas tu código QR personal
    </div>
  </div>
</body>
</html>`;
}

/**
 * Servicio de envío de credenciales por email.
 * Soporta Resend API y simulación / logging en desarrollo o despliegues sin credenciales.
 */
export async function sendAccreditationEmail(data: AccreditationEmailData): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    const qrDataUrl = await generateQrDataUrl(data.qrPayload);
    const html = buildAccreditationEmailHtml(data, qrDataUrl);

    // 1. Si está configurado Resend
    if (process.env.RESEND_API_KEY) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Vidjs Pro <acreditaciones@vidjs.com>",
          to: [data.recipientEmail],
          subject: `🎟️ Tu Credencial de Acceso: ${data.eventTitle} (${data.categoryName})`,
          html,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        return { success: true, messageId: json.id };
      } else {
        const errJson = await response.json().catch(() => ({}));
        console.error("[EmailService] Error enviando con Resend:", errJson);
        return { success: false, error: errJson.message || "Error en servicio de correo" };
      }
    }

    // 2. Modo fallback: Simulación registrada en consola
    console.log(`[EmailService:Fallback] 📨 Credencial despachada para ${data.recipientName} <${data.recipientEmail}>`);
    console.log(`[EmailService:Fallback] Evento: ${data.eventTitle} | ID: ${data.codeNumber} | Categoría: ${data.categoryName}`);

    return {
      success: true,
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    };
  } catch (error: any) {
    console.error("[EmailService] Error inesperado en envío de credencial:", error);
    return { success: false, error: error.message || "Error al procesar envío de correo" };
  }
}
