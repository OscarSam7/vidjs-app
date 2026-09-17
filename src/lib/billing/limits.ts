import { prisma } from "../db/prisma";
import { AppError } from "../errors";

export type QuotaResource = "venues" | "tables" | "events";

export interface QuotaCheckResult {
  allowed: boolean;
  resource: QuotaResource;
  current: number;
  max: number;
  planName: string;
  planCode: string;
}

/**
 * Consulta el consumo actual de un recurso y el límite permitido por el plan de suscripción del Tenant.
 */
export async function checkTenantQuota(
  tenantId: string,
  resource: QuotaResource
): Promise<QuotaCheckResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { tenantId },
    include: { plan: true },
  });

  if (!subscription) {
    throw new AppError("El establecimiento no posee un plan de suscripción activo", 403, "NO_SUBSCRIPTION");
  }

  const plan = subscription.plan;
  let current = 0;
  let max = 0;

  switch (resource) {
    case "venues":
      current = await prisma.venue.count({ where: { tenantId } });
      max = plan.maxVenues;
      break;
    case "tables":
      current = await prisma.table.count({ where: { tenantId } });
      max = plan.maxActiveTables;
      break;
    case "events":
      current = await prisma.event.count({ where: { tenantId, status: "ACTIVE" } });
      max = plan.maxEventsPerMonth;
      break;
  }

  return {
    allowed: current < max,
    resource,
    current,
    max,
    planName: plan.name,
    planCode: plan.code,
  };
}

/**
 * Valida la cuota del plan y lanza una excepción HTTP 403 si el límite fue alcanzado.
 */
export async function assertTenantQuota(tenantId: string, resource: QuotaResource) {
  const check = await checkTenantQuota(tenantId, resource);

  if (!check.allowed) {
    const resourceNames = {
      venues: "locales físicos",
      tables: "mesas con código QR",
      events: "eventos activos",
    };

    throw new AppError(
      `Has alcanzado el límite de ${check.max} ${resourceNames[resource]} permitidas en tu ${check.planName}. Por favor, mejora tu plan en la sección de Suscripción para continuar agregando más.`,
      403,
      "QUOTA_EXCEEDED",
      {
        resource,
        current: check.current,
        max: check.max,
        planCode: check.planCode,
      }
    );
  }
}
