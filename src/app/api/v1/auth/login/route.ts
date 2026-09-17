import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { verifyPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookies";
import { UnauthorizedError, handleApiError } from "@/lib/errors";
import { Role } from "@/lib/rbac/permissions";

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    // Buscar usuario en base de datos
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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

    if (!user) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    if (user.status !== "ACTIVE") {
      throw new UnauthorizedError("La cuenta se encuentra inactiva o suspendida");
    }

    if (user.tenant && user.tenant.status !== "ACTIVE") {
      throw new UnauthorizedError("El establecimiento se encuentra suspendido");
    }

    // Validar contraseña
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError("Credenciales inválidas");
    }

    // Generar Token JWT
    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
    });

    // Guardar en cookie HTTP-Only segura
    await setSessionCookie(token);

    // Registrar en AuditLog
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        action: "AUTH_LOGIN",
        resource: "AUTH",
        resourceId: user.id,
        metadata: JSON.stringify({ email: user.email, role: user.role }),
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
