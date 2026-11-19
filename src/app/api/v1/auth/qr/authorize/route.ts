import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getSessionTokenFromCookies, setSessionCookie } from "@/lib/auth/cookies";
import { verifySessionToken, signSessionToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";
import { getClientIp } from "@/lib/security/rate-limit";
import { Role } from "@/lib/rbac/permissions";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const body = await req.json();
    const { code, pin, action = "APPROVE", email, password } = body;

    if (!code && !pin) {
      return NextResponse.json({ error: "Código o PIN requerido" }, { status: 400 });
    }

    // 1. Localizar la sesión QR
    const session = await prisma.qrLoginSession.findFirst({
      where: code ? { code } : { pin: pin?.trim() },
    });

    if (!session) {
      return NextResponse.json(
        { error: "Solicitud QR no encontrada o inválida" },
        { status: 404 }
      );
    }

    if (new Date() > session.expiresAt || session.status === "EXPIRED" || session.status === "CONSUMED") {
      return NextResponse.json(
        { error: "El código QR ha expirado. Por favor genera uno nuevo en la PC." },
        { status: 400 }
      );
    }

    if (session.status === "REJECTED") {
      return NextResponse.json(
        { error: "Esta solicitud de inicio de sesión ya fue rechazada." },
        { status: 400 }
      );
    }

    // Si la acción es RECHAZAR
    if (action === "REJECT") {
      await prisma.qrLoginSession.update({
        where: { id: session.id },
        data: { status: "REJECTED" },
      });
      return NextResponse.json({ success: true, status: "REJECTED", message: "Solicitud rechazada" });
    }

    // 2. Obtener usuario autenticado (bien por cookie existente en móvil, o por credenciales provistas)
    let authenticatedUserId: string | null = null;
    let newMobileLogin = false;

    // A) Revisar cookie actual del celular
    const cookieToken = await getSessionTokenFromCookies();
    if (cookieToken) {
      const payload = await verifySessionToken(cookieToken);
      if (payload?.sub) {
        authenticatedUserId = payload.sub;
      }
    }

    // B) Si no hay cookie pero envió credenciales, autenticar en el celular
    if (!authenticatedUserId && email && password) {
      const normalizedEmail = email.trim().toLowerCase();
      const userCand = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (userCand) {
        const valid = await verifyPassword(password, userCand.passwordHash);
        if (valid) {
          authenticatedUserId = userCand.id;
          newMobileLogin = true;
        }
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json(
        {
          error: "No hay una sesión activa en este teléfono. Por favor inicia sesión primero.",
          requiresLogin: true,
        },
        { status: 401 }
      );
    }

    // 3. Cargar datos completos del usuario y validar estados de cuenta
    const user = await prisma.user.findUnique({
      where: { id: authenticatedUserId },
      include: {
        tenant: {
          include: {
            subscription: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Tu cuenta de usuario no está activa o se encuentra pendiente de aprobación." },
        { status: 403 }
      );
    }

    // Validar suscripción y tenant si no es SUPER_ADMIN
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
            { error: `El período de servicio para '${user.tenant.name}' ha finalizado. Contacta al administrador.` },
            { status: 403 }
          );
        }
      }
    }

    // 4. Generar el JWT para la sesión en PC
    const pcSessionToken = await signSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
    });

    // 5. Si el celular inició sesión mediante el formulario directo en este paso, guardar su cookie también
    if (newMobileLogin) {
      const mobileSessionToken = await signSessionToken({
        sub: user.id,
        email: user.email,
        name: user.name,
        role: user.role as Role,
        tenantId: user.tenantId,
        tokenVersion: user.tokenVersion,
      });
      await setSessionCookie(mobileSessionToken);
    }

    // 6. Actualizar sesión QR como APROBADA con el token
    await prisma.qrLoginSession.update({
      where: { id: session.id },
      data: {
        status: "APPROVED",
        userId: user.id,
        sessionToken: pcSessionToken,
      },
    });

    // 7. Auditoría
    try {
      await prisma.auditLog.create({
        data: {
          tenantId: user.tenantId,
          userId: user.id,
          action: "AUTH_LOGIN_QR_AUTHORIZED",
          resource: "AUTH",
          resourceId: session.id,
          metadata: JSON.stringify({
            mobileIp: ip,
            pcDeviceInfo: session.deviceInfo,
            pcIp: session.ipAddress,
            authorizedUser: user.email,
          }),
        },
      });
    } catch {}

    return NextResponse.json({
      success: true,
      status: "APPROVED",
      message: `¡Acceso concedido a ${session.deviceInfo || "PC"}!`,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        establishment: user.tenant?.name || "CYNKO Central",
      },
      pcDeviceInfo: session.deviceInfo || "PC",
    });
  } catch (error) {
    console.error("[QR_AUTHORIZE_ERROR]", error);
    return NextResponse.json(
      { error: "Error al autorizar el dispositivo" },
      { status: 500 }
    );
  }
}
