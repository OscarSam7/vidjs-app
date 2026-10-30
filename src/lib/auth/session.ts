import { NextRequest } from "next/server";
import { getSessionTokenFromCookies } from "./cookies";
import { verifySessionToken, SessionPayload } from "./jwt";
import { prisma } from "../db/prisma";
import { UnauthorizedError, ForbiddenError } from "../errors";
import { Role, Permission, hasPermission } from "../rbac/permissions";
import { env } from "../env";

export async function getCurrentSession(req?: NextRequest): Promise<SessionPayload | null> {
  let token: string | null = null;
  if (req) {
    token = req.cookies.get(env.COOKIE_NAME)?.value || null;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  }

  if (!token) {
    try {
      token = await getSessionTokenFromCookies();
    } catch {
      token = null;
    }
  }

  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireUserSession(req?: NextRequest): Promise<SessionPayload> {
  const session = await getCurrentSession(req);
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

export async function requireRole(allowedRoles: Role[], req?: NextRequest): Promise<SessionPayload> {
  const session = await requireUserSession(req);
  if (!allowedRoles.includes(session.role)) {
    throw new ForbiddenError("No tienes permisos suficientes para realizar esta acción");
  }
  return session;
}

export async function requirePermission(permission: Permission, req?: NextRequest): Promise<SessionPayload> {
  const session = await requireUserSession(req);

  let customRolePermissions: Record<string, string[]> | null = null;
  if (session.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: session.tenantId },
      select: { settings: true },
    });
    if (tenant?.settings) {
      try {
        const parsed = JSON.parse(tenant.settings);
        if (parsed.rolePermissions) {
          customRolePermissions = parsed.rolePermissions;
        }
      } catch (err) {
        // ignore json parse error
      }
    }
  }

  if (!hasPermission(session.role, permission, customRolePermissions)) {
    throw new ForbiddenError(`Permiso denegado: Se requiere '${permission}'`);
  }
  return session;
}

export async function requireTenantContext(req?: NextRequest): Promise<{ session: SessionPayload; tenantId: string }> {
  const session = await requireUserSession(req);

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
