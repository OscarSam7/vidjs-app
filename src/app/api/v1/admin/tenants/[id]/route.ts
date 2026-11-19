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
    const { status, planCode, extendDays, ownerStatus } = body;

    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        subscription: true,
        users: true,
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

    // Actualizar Suscripción si se solicita cambio de plan o extensión de días
    if (tenant.subscription && (planCode || extendDays)) {
      const subUpdates: any = {};

      if (planCode) {
        const plan = await prisma.plan.findUnique({ where: { code: planCode } });
        if (plan) {
          subUpdates.planId = plan.id;
        }
      }

      if (extendDays && typeof extendDays === "number") {
        const baseDate = tenant.subscription.currentPeriodEnd > new Date()
          ? tenant.subscription.currentPeriodEnd
          : new Date();
        const newEnd = new Date(baseDate);
        newEnd.setDate(newEnd.getDate() + extendDays);
        subUpdates.currentPeriodEnd = newEnd;
        subUpdates.status = "ACTIVE";
      }

      if (status === "ACTIVE") {
        subUpdates.status = "ACTIVE";
      } else if (status === "SUSPENDED") {
        subUpdates.status = "CANCELED";
      }

      await prisma.subscription.update({
        where: { id: tenant.subscription.id },
        data: subUpdates,
      });
    }

    // Actualizar usuarios del tenant si se requiere
    if (ownerStatus || status) {
      const userStatusToApply = ownerStatus || (status === "ACTIVE" ? "ACTIVE" : status === "SUSPENDED" ? "SUSPENDED" : "PENDING");
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
