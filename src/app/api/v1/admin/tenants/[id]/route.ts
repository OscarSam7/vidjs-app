import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Solo accesible por SUPER_ADMIN
    await requireRole(["SUPER_ADMIN"]);
    const { id } = await params;

    const body = await req.json();
    const { status, planCode, exactDays, addDays, targetDate, expireNow, ownerStatus } = body;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: true,
        users: true,
        venues: true,
      },
    });

    if (!tenant) {
      throw new NotFoundError("Establecimiento no encontrado");
    }

    const updates: any = {};
    if (status) {
      updates.status = status; // "ACTIVE", "PENDING_APPROVAL", "SUSPENDED"
    }

    // Actualizar Tenant
    const updatedTenant = await prisma.tenant.update({
      where: { id },
      data: updates,
    });

    // Actualizar Sede / Locales (Venues)
    if (status === "ACTIVE") {
      await prisma.venue.updateMany({
        where: { tenantId: id },
        data: { active: true },
      });
    } else if (status === "SUSPENDED") {
      await prisma.venue.updateMany({
        where: { tenantId: id },
        data: { active: false },
      });
    }

    // Actualizar Suscripción y Período de Días
    if (tenant.subscription) {
      const subUpdates: any = {};

      if (planCode) {
        const plan = await prisma.plan.findUnique({ where: { code: planCode } });
        if (plan) {
          subUpdates.planId = plan.id;
        }
      }

      // A) Bloquear o expirar inmediatamente
      if (expireNow) {
        const expiredDate = new Date(Date.now() - 1000 * 60 * 5); // 5 min en el pasado
        subUpdates.currentPeriodEnd = expiredDate;
        subUpdates.status = "PAST_DUE";
      }
      // B) Asignar cantidad exacta de días a partir de este momento
      else if (typeof exactDays === "number" && exactDays > 0) {
        const now = new Date();
        const newEnd = new Date(now.getTime() + exactDays * 24 * 60 * 60 * 1000);
        subUpdates.currentPeriodStart = now;
        subUpdates.currentPeriodEnd = newEnd;
        subUpdates.status = "ACTIVE";

        // Asegurar que el tenant y usuarios queden en ACTIVE
        await prisma.tenant.update({
          where: { id },
          data: { status: "ACTIVE" },
        });
        await prisma.user.updateMany({
          where: { tenantId: id },
          data: { status: "ACTIVE" },
        });
        await prisma.venue.updateMany({
          where: { tenantId: id },
          data: { active: true },
        });
      }
      // C) Asignar fecha específica de corte (calendario)
      else if (targetDate) {
        const parsedDate = new Date(targetDate);
        if (!isNaN(parsedDate.getTime())) {
          subUpdates.currentPeriodEnd = parsedDate;
          if (parsedDate > new Date()) {
            subUpdates.status = "ACTIVE";
          } else {
            subUpdates.status = "PAST_DUE";
          }
        }
      }
      // D) Sumar días al vencimiento existente
      else if (typeof addDays === "number" && addDays > 0) {
        const baseDate =
          tenant.subscription.currentPeriodEnd > new Date()
            ? tenant.subscription.currentPeriodEnd
            : new Date();
        const newEnd = new Date(baseDate.getTime() + addDays * 24 * 60 * 60 * 1000);
        subUpdates.currentPeriodEnd = newEnd;
        subUpdates.status = "ACTIVE";
      }
      // E) Si se activa por primera vez sin especificar días, dar 30 días
      else if (status === "ACTIVE" && tenant.status !== "ACTIVE") {
        const now = new Date();
        const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        subUpdates.status = "ACTIVE";
        subUpdates.currentPeriodStart = now;
        subUpdates.currentPeriodEnd = periodEnd;
      } else if (status === "SUSPENDED") {
        subUpdates.status = "CANCELED";
      }

      if (Object.keys(subUpdates).length > 0) {
        await prisma.subscription.update({
          where: { id: tenant.subscription.id },
          data: subUpdates,
        });
      }
    }

    // Actualizar usuarios del tenant
    if (ownerStatus || status || exactDays || expireNow) {
      let userStatusToApply = "ACTIVE";
      if (expireNow || status === "SUSPENDED") {
        userStatusToApply = "SUSPENDED";
      } else if (status === "PENDING_APPROVAL") {
        userStatusToApply = "PENDING";
      } else {
        userStatusToApply = ownerStatus || "ACTIVE";
      }

      await prisma.user.updateMany({
        where: { tenantId: id },
        data: { status: userStatusToApply },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Establecimiento ${updatedTenant.name} actualizado correctamente`,
      data: updatedTenant,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
