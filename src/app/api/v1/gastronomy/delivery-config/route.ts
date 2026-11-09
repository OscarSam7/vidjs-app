import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { PERMISSIONS, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { ensureGastronomySeeded } from "@/lib/gastronomy/seed-defaults";

const updateDeliveryConfigSchema = z.object({
  venueId: z.string().optional(),
  barPickupEnabled: z.boolean().optional(),
  waiterDeliveryEnabled: z.boolean().optional(),
  defaultDeliveryMode: z.enum(["BAR_PICKUP", "WAITER_DELIVERY"]).optional(),
  serviceFeeCents: z.coerce.number().int().nonnegative().optional(),
  serviceFeePercent: z.coerce.number().nonnegative().optional(),
  requirePaymentBeforePrep: z.boolean().optional(),
  allowKitchenDirectDeliveryException: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const venueIdParam = searchParams.get("venueId") || undefined;

    const seeded = await ensureGastronomySeeded(tenantId, venueIdParam);
    const targetVenueId = venueIdParam || seeded?.venueId;

    const config = targetVenueId
      ? await prisma.gastroDeliveryConfig.findUnique({ where: { venueId: targetVenueId } })
      : await prisma.gastroDeliveryConfig.findFirst({ where: { tenantId } });

    return NextResponse.json({ success: true, deliveryConfig: config });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();

    // Fase 3: La administración y la barra deben poder activar o desactivar la modalidad de entrega
    const canConfigureDelivery = hasAnyPermission(session.role, [
      PERMISSIONS.GASTRO_SETTINGS_MANAGE,
      PERMISSIONS.GASTRO_BAR_MANAGE,
      PERMISSIONS.GASTRO_BAR_OPERATE,
    ]);

    if (!canConfigureDelivery) {
      throw new ForbiddenError("No tienes permisos para cambiar la modalidad de entrega");
    }

    const body = await req.json();
    const data = updateDeliveryConfigSchema.parse(body);

    let targetVenueId = data.venueId;
    if (!targetVenueId) {
      const firstVenue = await prisma.venue.findFirst({
        where: { tenantId, active: true },
        orderBy: { createdAt: "asc" },
      });
      if (!firstVenue) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "No hay sedes activas" } },
          { status: 404 }
        );
      }
      targetVenueId = firstVenue.id;
    }

    const existing = await prisma.gastroDeliveryConfig.findUnique({
      where: { venueId: targetVenueId },
    });

    const nextBarPickup = data.barPickupEnabled ?? existing?.barPickupEnabled ?? true;
    const nextWaiterDelivery = data.waiterDeliveryEnabled ?? existing?.waiterDeliveryEnabled ?? true;

    // Si una modalidad se desactiva y era la predeterminada, ajustar automáticamente la predeterminada
    let nextDefault = data.defaultDeliveryMode ?? existing?.defaultDeliveryMode ?? "WAITER_DELIVERY";
    if (nextDefault === "BAR_PICKUP" && !nextBarPickup && nextWaiterDelivery) {
      nextDefault = "WAITER_DELIVERY";
    } else if (nextDefault === "WAITER_DELIVERY" && !nextWaiterDelivery && nextBarPickup) {
      nextDefault = "BAR_PICKUP";
    }

    const updated = await prisma.gastroDeliveryConfig.upsert({
      where: { venueId: targetVenueId },
      update: {
        barPickupEnabled: nextBarPickup,
        waiterDeliveryEnabled: nextWaiterDelivery,
        defaultDeliveryMode: nextDefault,
        ...(data.serviceFeeCents !== undefined ? { serviceFeeCents: data.serviceFeeCents } : {}),
        ...(data.serviceFeePercent !== undefined ? { serviceFeePercent: data.serviceFeePercent } : {}),
        ...(data.requirePaymentBeforePrep !== undefined
          ? { requirePaymentBeforePrep: data.requirePaymentBeforePrep }
          : {}),
        ...(data.allowKitchenDirectDeliveryException !== undefined
          ? { allowKitchenDirectDeliveryException: data.allowKitchenDirectDeliveryException }
          : {}),
        updatedByUserId: session.sub,
        updatedByName: session.name,
      },
      create: {
        tenantId,
        venueId: targetVenueId,
        barPickupEnabled: nextBarPickup,
        waiterDeliveryEnabled: nextWaiterDelivery,
        defaultDeliveryMode: nextDefault,
        serviceFeeCents: data.serviceFeeCents ?? 0,
        serviceFeePercent: data.serviceFeePercent ?? 0,
        requirePaymentBeforePrep: data.requirePaymentBeforePrep ?? false,
        allowKitchenDirectDeliveryException: data.allowKitchenDirectDeliveryException ?? false,
        updatedByUserId: session.sub,
        updatedByName: session.name,
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "GASTRO_DELIVERY_CONFIG_UPDATED",
        resource: "GASTRO_DELIVERY_CONFIG",
        resourceId: updated.id,
        metadata: JSON.stringify({
          barPickupEnabled: updated.barPickupEnabled,
          waiterDeliveryEnabled: updated.waiterDeliveryEnabled,
          defaultDeliveryMode: updated.defaultDeliveryMode,
          serviceFeeCents: updated.serviceFeeCents,
          updatedBy: session.name,
        }),
      },
    });

    realtimeBus.broadcast("global", "GASTRO_DELIVERY_CONFIG_UPDATED", {
      tenantId,
      venueId: targetVenueId,
      deliveryConfig: updated,
    });

    return NextResponse.json({ success: true, deliveryConfig: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
