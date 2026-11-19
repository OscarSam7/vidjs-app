import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

const resetSchema = z.object({
  token: z.string().min(10, "Token inválido"),
  password: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres").max(128),
});

// GET: Validar si el token sigue activo antes de mostrar el formulario
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token no proporcionado" }, { status: 400 });
    }

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            tenant: { select: { name: true } },
          },
        },
      },
    });

    if (!resetRecord || resetRecord.used || new Date() > resetRecord.expiresAt) {
      return NextResponse.json(
        { valid: false, error: "El enlace es inválido o ha expirado. Por favor solicita uno nuevo." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: resetRecord.user.email,
      name: resetRecord.user.name,
      establishment: resetRecord.user.tenant?.name || "CYNKO OS",
    });
  } catch (error) {
    console.error("[VALIDATE_TOKEN_ERROR]", error);
    return NextResponse.json({ valid: false, error: "Error de validación" }, { status: 500 });
  }
}

// POST: Aplicar el cambio de contraseña
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const ipLimit = rateLimit(`reset-pwd:ip:${ip}`, 10, 15 * 60 * 1000);
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera antes de volver a intentar." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { token, password } = resetSchema.parse(body);

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetRecord || resetRecord.used || new Date() > resetRecord.expiresAt) {
      return NextResponse.json(
        { error: "El enlace de recuperación es inválido o ha expirado. Por favor solicita un nuevo restablecimiento." },
        { status: 400 }
      );
    }

    // Hashear nueva contraseña
    const passwordHash = await hashPassword(password);

    // Actualizar usuario: nueva contraseña e incrementar tokenVersion para invalidar sesiones antiguas
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 },
        },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { used: true },
      }),
      prisma.auditLog.create({
        data: {
          tenantId: resetRecord.user.tenantId,
          userId: resetRecord.userId,
          action: "AUTH_PASSWORD_RESET_SUCCESS",
          resource: "AUTH",
          resourceId: resetRecord.userId,
          metadata: JSON.stringify({ email: resetRecord.user.email, ip }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: "¡Contraseña actualizada con éxito! Ya puedes iniciar sesión con tu nueva contraseña.",
    });
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { error: "Error al actualizar la contraseña" },
      { status: 500 }
    );
  }
}
