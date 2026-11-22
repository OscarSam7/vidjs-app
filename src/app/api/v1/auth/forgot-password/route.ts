import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/security/sanitize";
import { sendEmail } from "@/lib/email/mailer";

const forgotSchema = z.object({
  email: z.string().email("Correo electrónico inválido").max(100),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate limiting: máx 5 solicitudes cada 15 min por IP
    const ipLimit = rateLimit(`forgot-pwd:ip:${ip}`, 5, 15 * 60 * 1000);
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera unos minutos antes de solicitar nuevamente." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email: rawEmail } = forgotSchema.parse(body);
    const email = sanitizeText(rawEmail).toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: {
          select: { name: true },
        },
      },
    });

    // Para evitar enumeración de usuarios, siempre respondemos con éxito genérico
    const genericResponse = {
      success: true,
      message: "Si tu correo se encuentra registrado en CYNKO, recibirás un enlace para restablecer tu contraseña.",
    };

    if (!user) {
      return NextResponse.json(genericResponse);
    }

    // Invalida tokens previos no utilizados para este usuario
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    }).catch(() => {});

    // Generar token criptográfico seguro
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora de validez

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Construir URL de restablecimiento
    const host = req.headers.get("host") || "cynko.app";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const resetUrl = `${proto}://${host}/reset-password?token=${token}`;

    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Restablecer Contraseña - CYNKO OS</title>
</head>
<body style="margin:0;padding:24px;background-color:#070709;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f4f4f5;">
  <div style="max-width:540px;margin:0 auto;background:#111116;border:1px solid #27272a;border-radius:24px;overflow:hidden;padding:36px 28px;text-align:center;">
    <div style="margin-bottom:24px;">
      <h2 style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;margin:0 0 6px 0;">CYNKO<span style="color:#fbbf24;"> OS</span></h2>
      <p style="font-size:12px;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px;margin:0;">Venues & Entertainment OS</p>
    </div>
    
    <div style="background:#18181b;border:1px solid #27272a;border-radius:18px;padding:24px;text-align:left;margin-bottom:24px;">
      <h3 style="font-size:16px;font-weight:700;color:#ffffff;margin:0 0 8px 0;">Solicitud de Restablecimiento de Contraseña</h3>
      <p style="font-size:13px;color:#a1a1aa;line-height:1.6;margin:0 0 16px 0;">
        Hola <strong>${user.name}</strong>, recibimos una solicitud para restablecer la contraseña de acceso a tu cuenta (${user.email}) en <strong>${user.tenant?.name || "CYNKO OS"}</strong>.
      </p>
      
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg,#c026d3 0%,#f59e0b 100%);color:#ffffff;text-decoration:none;border-radius:14px;font-weight:800;font-size:14px;box-shadow:0 8px 20px rgba(192,38,211,0.3);">
          Restablecer mi Contraseña &rarr;
        </a>
      </div>

      <p style="font-size:11px;color:#a1a1aa;line-height:1.5;margin:0 0 12px 0;word-break:break-all;">
        Si el botón no funciona, copia y pega este enlace en tu navegador:<br/>
        <a href="${resetUrl}" style="color:#22d3ee;">${resetUrl}</a>
      </p>
      
      <p style="font-size:11px;color:#71717a;margin:0;">
        Este enlace es válido durante <strong>60 minutos</strong>. Si tú no realizaste esta solicitud, puedes ignorar este mensaje; tu contraseña actual permanecerá intacta.
      </p>
    </div>

    <p style="font-size:11px;color:#52525b;margin:0;">
      CYNKO OS &bull; Seguridad Multi-Tenant en la Nube
    </p>
  </div>
</body>
</html>
    `;

    const emailText = `Hola ${user.name},\n\nRecibimos una solicitud para restablecer tu contraseña en CYNKO OS (${user.tenant?.name || "CYNKO OS"}).\n\nAbre el siguiente enlace para crear una nueva contraseña (válido por 60 minutos):\n${resetUrl}\n\nSi no solicitaste este cambio, ignora este correo.`;

    const mailResult = await sendEmail({
      to: user.email,
      subject: "🔐 Restablece tu contraseña de CYNKO OS",
      html: emailHtml,
      text: emailText,
    });

    if (!mailResult.sent) {
      console.error(`[FORGOT_PASSWORD_DELIVERY_FAILED] provider=${mailResult.provider} err=${mailResult.error} resetUrl=${resetUrl}`);
      return NextResponse.json(
        {
          error:
            mailResult.provider === "none"
              ? "El servidor aún no tiene configurado el envío de correos (Gmail SMTP o Resend). Contacta al soporte por WhatsApp para restablecer tu clave al instante."
              : `No se pudo enviar el correo en este momento (${mailResult.error || "error del proveedor"}). Intenta de nuevo o solicita soporte por WhatsApp.`,
          emailNotConfigured: mailResult.provider === "none",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud de recuperación" },
      { status: 500 }
    );
  }
}
