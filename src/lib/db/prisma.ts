import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Helper para forzar y validar el contexto de Tenant en consultas de base de datos.
 * Evita accesos no autorizados a nivel de servicio.
 */
export function assertTenantAccess(userTenantId: string | null, targetTenantId: string) {
  // SUPER_ADMIN (userTenantId == null) tiene acceso global
  if (userTenantId === null) return;

  if (userTenantId !== targetTenantId) {
    throw new Error("Violación de aislamiento multi-tenant: Acceso denegado a datos de otro establecimiento");
  }
}
