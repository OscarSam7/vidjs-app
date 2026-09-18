import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

const changePlanSchema = z.object({
  planCode: z.enum(["PERSONAL", "STARTER", "PRO", "ENTERPRISE"]),
});

export async function POST(req: NextRequest) {
  try {
    await requireRole(["OWNER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();

    const body = await req.json();
    const { planCode } = changePlanSchema.parse(body);

    // 1. Buscar el nuevo plan solicitado
    const newPlan = await prisma.plan.findUnique({
      where: { code: planCode },
    });

    if (!newPlan) {
      throw new NotFoundError(`El plan '${planCode}' no existe en el catálogo.`);
    }

    // 2. Actualizar suscripción existente o crearla
    const nextPeriodEnd = new Date();
    nextPeriodEnd.setDate(nextPeriodEnd.getDate() + 30);

    const updatedSubscription = await prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId: newPlan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextPeriodEnd,
        cancelAtPeriodEnd: false,
      },
      create: {
        tenantId,
        planId: newPlan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextPeriodEnd,
        cancelAtPeriodEnd: false,
      },
      include: {
        plan: true,
      },
    });

    // 3. Registrar auditoría de cambio de suscripción
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "SUBSCRIPTION_PLAN_CHANGED",
        resource: "SUBSCRIPTION",
        resourceId: updatedSubscription.id,
        metadata: JSON.stringify({
          previousPlan: session.role,
          newPlan: newPlan.name,
          planCode: newPlan.code,
          priceCents: newPlan.priceCents,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `¡Plan actualizado con éxito a ${newPlan.name}!`,
      data: {
        subscription: updatedSubscription,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
