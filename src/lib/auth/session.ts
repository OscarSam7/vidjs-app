import { getSessionTokenFromCookies } from "./cookies";
import { verifySessionToken, SessionPayload } from "./jwt";
import { prisma } from "../db/prisma";
import { UnauthorizedError, ForbiddenError } from "../errors";
import { Role, Permission, hasPermission } from "../rbac/permissions";

export async function getCurrentSession(): Promise<SessionPayload | null> {
  const token = await getSessionTokenFromCookies();
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireUserSession(): Promise<SessionPayload> {
  const session = await getCurrentSession();
  if (!session) {
    throw new UnauthorizedError("Debes iniciar sesión para acceder");
  }

  // Validación de seguridad en base de datos: estado y tokenVersion
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, status: true, tokenVersion: true, tenantId: true },
  });

  if (!user || user.status !== "ACTIVE" || user.tokenVersion !== session.tokenVersion) {
    throw new UnauthorizedError("Sesión inválida o cuenta desactivada");
  }

  return session;
}

export async function requireRole(allowedRoles: Role[]): Promise<SessionPayload> {
  const session = await requireUserSession();
  if (!allowedRoles.includes(session.role)) {
    throw new ForbiddenError("No tienes permisos suficientes para realizar esta acción");
  }
  return session;
}

export async function requirePermission(permission: Permission): Promise<SessionPayload> {
  const session = await requireUserSession();
  if (!hasPermission(session.role, permission)) {
    throw new ForbiddenError(`Permiso denegado: Se requiere '${permission}'`);
  }
  return session;
}

export async function requireTenantContext(): Promise<{ session: SessionPayload; tenantId: string }> {
  const session = await requireUserSession();

  if (!session.tenantId && session.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("El usuario no pertenece a ningún establecimiento");
  }

  // Si es SUPER_ADMIN y no tiene tenantId asociado, devolvemos el primer tenant activo para contexto
  let tenantId = session.tenantId;
  if (!tenantId && session.role === "SUPER_ADMIN") {
    const firstTenant = await prisma.tenant.findFirst({ where: { status: "ACTIVE" } });
    if (!firstTenant) {
      throw new ForbiddenError("No existen establecimientos configurados");
    }
    tenantId = firstTenant.id;
  }

  return { session, tenantId: tenantId! };
}
