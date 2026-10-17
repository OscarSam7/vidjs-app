import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword, dummyVerifyPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookies";
import { UnauthorizedError, handleApiError } from "@/lib/errors";
import { Role } from "@/lib/rbac/permissions";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/security/sanitize";

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido").max(100),
  password: z.string().min(1, "La contraseña es requerida").max(128),
});

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // 1. Rate Limiting por IP (Máximo 10 intentos por cada 15 minutos)
    const ipLimit = rateLimit(`login:ip:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Demasiados intentos de inicio de sesión desde esta IP. Por favor espere antes de reintentar.",
          retryAfterSeconds: ipLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipLimit.retryAfterSeconds),
          },
        }
      );
    }

    const body = await req.json();
    const { email: rawEmail, password } = loginSchema.parse(body);
    const email = sanitizeText(rawEmail).toLowerCase();

    // 2. Rate Limiting por Email (Máximo 5 intentos por cuenta cada 15 minutos para prevenir fuerza bruta distribuida)
    const emailLimit = rateLimit(`login:account:${email}`, 5, 15 * 60 * 1000);
    if (!emailLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Demasiados intentos fallidos para esta cuenta. Por seguridad, intente más tarde.",
          retryAfterSeconds: emailLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(emailLimit.retryAfterSeconds),
          },
        }
      );
    }

    // 3. Buscar usuario en base de datos de manera parametrizada (Prisma)
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            logoUrl: true,
          },
        },
      },
    });

    // 4. Si el usuario no existe, ejecutar comparación sintética para mitigar ataques de temporización
    if (!user) {
      await dummyVerifyPassword(password);
      throw new UnauthorizedError("Credenciales inválidas");
    }

    // 5. Validar estado de la cuenta y del establecimiento
    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("La cuenta se encuentra inactiva o suspendida");
    }

    if (user.tenant && user.tenant.status !== "ACTIVE") {
      throw new UnauthorizedError("El establecimiento se encuentra suspendido");
    }

    // 6. Validar contraseña con Bcrypt
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    // 7. Generar Token JWT con claims mínimos seguros
    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
    });

    // 8. Guardar en cookie HTTP-Only segura
    await setSessionCookie(token);

    // 9. Registrar en AuditLog para trazabilidad forense
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: "AUTH_LOGIN",
        resource: "AUTH",
        resourceId: user.id,
        metadata: JSON.stringify({ email: user.email, role: user.role, ip }),
      },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenant: user.tenant,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
