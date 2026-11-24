import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { prisma } from "@/lib/db/prisma";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookies";
import { Role } from "@/lib/rbac/permissions";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { sendEmail } from "@/lib/email/mailer";

const googleSchema = z.object({
  credential: z.string().optional(), // Google ID Token de Google Identity Services
  email: z.string().email().optional(), // Acceso directo por Gmail
  pin: z.string().optional(), // PIN de acceso mágico recibido por Gmail
  requestPin: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const ipLimit = rateLimit(`google-auth:ip:${ip}`, 20, 15 * 60 * 1000);
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera unos minutos." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { credential, email: rawEmail, pin, requestPin } = googleSchema.parse(body);

    let targetEmail: string | null = null;
    let googleName: string | null = null;
    let isGoogleVerified = false;

    // 1. Validar Credencial Oficial de Google (Google One Tap / GIS)
    if (credential) {
      try {
        const verifyRes = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
        );
        if (!verifyRes.ok) {
          return NextResponse.json(
            { error: "El token de Google es inválido o ha expirado." },
            { status: 400 }
          );
        }

        const tokenInfo = await verifyRes.json();
        if (tokenInfo.email_verified === "true" || tokenInfo.email_verified === true) {
          targetEmail = tokenInfo.email.toLowerCase().trim();
          googleName = tokenInfo.name || tokenInfo.given_name || "Usuario Google";
          isGoogleVerified = true;
        } else {
          return NextResponse.json(
            { error: "El correo de Google no se encuentra verificado." },
            { status: 400 }
          );
        }
      } catch (err) {
        console.error("[GOOGLE_TOKEN_VERIFY_ERROR]", err);
        return NextResponse.json(
          { error: "No se pudo comunicar con los servidores de autenticación de Google." },
          { status: 502 }
        );
      }
    } else if (rawEmail) {
      targetEmail = rawEmail.toLowerCase().trim();
    }

    if (!targetEmail) {
      return NextResponse.json(
        { error: "Se requiere un correo de Gmail o credencial de Google." },
        { status: 400 }
      );
    }

    // 2. Buscar usuario en base de datos
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            status: true,
            subscription: {
              select: {
                id: true,
                status: true,
                currentPeriodEnd: true,
              },
            },
          },
        },
      },
    });

    // 3. Si el usuario no existe en la plataforma
    if (!user) {
      return NextResponse.json({
        success: false,
        notRegistered: true,
        email: targetEmail,
        message: `El correo ${targetEmail} no está registrado en CYNKO OS. ¿Deseas registrar tu establecimiento?`,
      });
    }

    // 4. Validar estado de la cuenta
    if (user.status !== "ACTIVE") {
      if (user.status === "PENDING") {
        return NextResponse.json(
          { error: "Tu cuenta se encuentra pendiente de aprobación por el Super Administrador de CYNKO." },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: "La cuenta se encuentra inactiva o suspendida." },
        { status: 403 }
      );
    }

    // 5. Validar suscripción y tenant si no es SUPER_ADMIN
    if (user.role !== "SUPER_ADMIN" && user.tenant) {
      if (user.tenant.status !== "ACTIVE") {
        return NextResponse.json(
          { error: `El establecimiento '${user.tenant.name}' se encuentra inactivo.` },
          { status: 403 }
        );
      }
      if (user.tenant.subscription?.currentPeriodEnd) {
        const isExpired = new Date(user.tenant.subscription.currentPeriodEnd) <= new Date();
        if (isExpired) {
          return NextResponse.json(
            { error: `El período para '${user.tenant.name}' ha finalizado. Contacta al administrador para renovar.` },
            { status: 403 }
          );
        }
      }
    }

    // 6. Si no viene verificado por Google OAuth, procesar acceso mágico por PIN
    if (!isGoogleVerified) {
      // Si el cliente pide solicitar PIN mágico a su Gmail
      if (requestPin) {
        const randomPin = crypto.randomInt(100000, 999999).toString();
        const pinExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        // Guardar token temporal
        await prisma.passwordResetToken.deleteMany({
          where: { userId: user.id },
        }).catch(() => {});

        await prisma.passwordResetToken.create({
          data: {
            token: `gpin_${randomPin}`,
            userId: user.id,
            expiresAt: pinExpiresAt,
          },
        });

        const mailResult = await sendEmail({
          to: user.email,
          subject: `🔐 Tu código de acceso rápido CYNKO: ${randomPin}`,
          html: `
            <div style="font-family:sans-serif;background:#09090b;color:#fff;padding:24px;border-radius:16px;max-width:480px;margin:0 auto;">
              <h2 style="color:#fbbf24;margin-top:0;">CYNKO OS</h2>
              <p>Hola <strong>${user.name}</strong>, tu código de acceso rápido con Gmail es:</p>
              <div style="font-size:32px;font-family:monospace;font-weight:bold;letter-spacing:6px;color:#e879f9;background:#18181b;padding:16px;border-radius:12px;text-align:center;margin:20px 0;">
                ${randomPin}
              </div>
              <p style="font-size:12px;color:#71717a;">Válido por 15 minutos. Si tú no lo solicitaste, ignora este mensaje.</p>
            </div>
          `,
          text: `Hola ${user.name}, tu código de acceso rápido a CYNKO OS es: ${randomPin} (válido por 15 minutos).`,
        });

        if (!mailResult.sent) {
          return NextResponse.json(
            {
              error:
                mailResult.provider === "none"
                  ? "El servicio de envío de correos (Gmail SMTP / Resend) aún no está configurado en el servidor."
                  : `No se pudo enviar el código a tu correo (${mailResult.error || "error de envío"}).`,
            },
            { status: 503 }
          );
        }

        return NextResponse.json({
          success: true,
          pinSent: true,
          email: user.email,
          message: `Enviamos un código de 6 dígitos a ${user.email} para confirmar tu acceso directo.`,
        });
      }

      // Si envía el PIN para validar
      if (pin) {
        const foundToken = await prisma.passwordResetToken.findFirst({
          where: {
            token: `gpin_${pin.trim()}`,
            userId: user.id,
            used: false,
            expiresAt: { gt: new Date() },
          },
        });

        if (!foundToken) {
          return NextResponse.json(
            { error: "Código incorrecto o expirado. Solicita uno nuevo." },
            { status: 400 }
          );
        }

        // Marcar consumido
        await prisma.passwordResetToken.update({
          where: { id: foundToken.id },
          data: { used: true },
        });
      } else {
        return NextResponse.json(
          { error: "Se requiere verificar la credencial de Google o el código de acceso." },
          { status: 400 }
        );
      }
    }

    // 7. Generar Token de Sesión JWT
    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
    });

    // 8. Guardar cookie segura
    await setSessionCookie(token);

    // 9. Registrar auditoría
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: "AUTH_LOGIN_GOOGLE",
          resource: "AUTH",
          resourceId: user.id,
          metadata: JSON.stringify({ email: user.email, ip, method: isGoogleVerified ? "GOOGLE_ONE_TAP" : "GMAIL_PIN" }),
        },
      });
    } catch {}

    // 10. Calcular redirección adecuada
    const role = user.role;
    let redirectUrl = "/dashboard";
    if (role === "DJ" || role === "OPERATOR") {
      redirectUrl = "/dashboard/dj";
    } else if (role === "CAJERO") {
      redirectUrl = "/dashboard/gastronomy/cashier";
    } else if (role === "MOZO") {
      redirectUrl = "/dashboard/gastronomy/waiters";
    } else if (role === "ENCARGADO_COCINA" || role === "COCINERO") {
      redirectUrl = "/dashboard/gastronomy/kitchen";
    } else if (role === "ENCARGADO_BARRA" || role === "OPERADOR_BARRA") {
      redirectUrl = "/dashboard/gastronomy/bar";
    }

    return NextResponse.json({
      success: true,
      message: `Bienvenido de nuevo, ${user.name}`,
      redirectUrl,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        establishment: user.tenant?.name || "CYNKO OS",
      },
    });
  } catch (error) {
    console.error("[GOOGLE_AUTH_ERROR]", error);
    return NextResponse.json(
      { error: "Error al procesar la autenticación con Google" },
      { status: 500 }
    );
  }
}
