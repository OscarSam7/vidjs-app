import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword } from "@/lib/auth/password";
import { signSessionToken } from "@/lib/auth/jwt";
import { setSessionCookie } from "@/lib/auth/cookies";
import { handleApiError, ConflictError, ValidationError } from "@/lib/errors";
import { rateLimit, getClientIp } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/security/sanitize";
import { Role } from "@/lib/rbac/permissions";

const registerSchema = z.object({
  ownerName: z.string().min(2, "El nombre debe tener al menos 2 caracteres").max(60),
  venueName: z.string().min(2, "El nombre del local debe tener al menos 2 caracteres").max(80),
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  serviceType: z.enum(["FULL_VENUE", "AUDIO_CABINA_PRO", "KARAOKE_BAR"]).default("FULL_VENUE"),
  phone: z.string().optional(),
});

function generateSlug(text: string): string {
  const base = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
  return base || "local";
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP para prevenir registros masivos maliciosos
    const ip = getClientIp(req);
    const ipLimit = rateLimit(`register:ip:${ip}`, 5, 10 * 60 * 1000); // Máx 5 registros cada 10 min por IP
    if (!ipLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Demasiados registros desde esta conexión. Por favor intente más tarde.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const data = registerSchema.parse(body);

    const email = sanitizeText(data.email).toLowerCase();
    const ownerName = sanitizeText(data.ownerName);
    const venueName = sanitizeText(data.venueName);

    // 2. Verificar si el correo ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictError("Ya existe una cuenta registrada con este correo electrónico.");
    }

    // 3. Generar slug único para el establecimiento
    let baseSlug = generateSlug(venueName);
    let finalSlug = baseSlug;
    let counter = 1;
    while (await prisma.tenant.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter}`;
      counter++;
    }

    // 4. Buscar o asegurar Plan Pro inicial
    let defaultPlan = await prisma.plan.findUnique({
      where: { code: "PRO" },
    });
    if (!defaultPlan) {
      defaultPlan = await prisma.plan.findFirst();
    }

    // 5. Hash seguro de la contraseña
    const passwordHash = await hashPassword(data.password);

    // 6. Transacción atómica: Crear Tenant en PENDING_APPROVAL, Venue principal, Usuario OWNER PENDING
    const result = await prisma.$transaction(async (tx) => {
      // A. Crear Tenant con estado PENDING_APPROVAL
      const tenant = await tx.tenant.create({
        data: {
          name: venueName,
          slug: finalSlug,
          status: "PENDING_APPROVAL",
          settings: JSON.stringify({
            serviceType: data.serviceType,
            registeredAt: new Date().toISOString(),
          }),
        },
      });

      // B. Crear Sede / Local Principal (Inactiva hasta aprobación)
      const venue = await tx.venue.create({
        data: {
          tenantId: tenant.id,
          name: venueName,
          slug: finalSlug,
          active: false,
          phone: data.phone || null,
        },
      });

      // C. Crear Usuario OWNER en estado PENDING
      const user = await tx.user.create({
        data: {
          name: ownerName,
          email,
          passwordHash,
          role: "OWNER",
          status: "PENDING",
          phone: data.phone || null,
          tenantId: tenant.id,
        },
      });

      // D. Crear Suscripción en estado TRIALING / PENDING_APPROVAL
      if (defaultPlan) {
        const periodEnd = new Date();
        periodEnd.setDate(periodEnd.getDate() + 30);

        await tx.subscription.create({
          data: {
            tenantId: tenant.id,
            planId: defaultPlan.id,
            status: "TRIALING",
            currentPeriodStart: new Date(),
            currentPeriodEnd: periodEnd,
          },
        });
      }

      // E. Crear Registro de Auditoría
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          action: "AUTH_REGISTER_PENDING",
          resource: "TENANT",
          resourceId: tenant.id,
          metadata: JSON.stringify({
            email: user.email,
            venueName,
            serviceType: data.serviceType,
            ip,
          }),
        },
      });

      return { tenant, venue, user };
    });

    // 7. En Opción A: NO se inicia sesión automática; la cuenta queda a la espera de activación del Super Admin
    return NextResponse.json({
      success: true,
      pendingApproval: true,
      message: "¡Establecimiento registrado con éxito! Tu solicitud está en revisión. El Super Administrador de CYNKO activará tu acceso en breve.",
      data: {
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        tenantId: result.tenant.id,
        tenantSlug: result.tenant.slug,
        serviceType: data.serviceType,
        venueName,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
