import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, BadRequestError } from "@/lib/errors";
import {
  PERMISSIONS,
  Permission,
  ROLE_PERMISSIONS,
  getEffectiveRolePermissions,
  Role,
} from "@/lib/rbac/permissions";

/**
 * GET /api/v1/team/permissions
 * Devuelve la matriz actual de permisos por rol para el establecimiento.
 */
export async function GET() {
  try {
    const { tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    let customRolePermissions: Record<string, string[]> | null = null;
    if (tenant?.settings) {
      try {
        const parsed = JSON.parse(tenant.settings);
        if (parsed.rolePermissions) {
          customRolePermissions = parsed.rolePermissions;
        }
      } catch (err) {
        // ignore
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        isCustomized: Boolean(customRolePermissions),
        rolePermissions: {
          OWNER: ROLE_PERMISSIONS.OWNER,
          MANAGER: getEffectiveRolePermissions("MANAGER", customRolePermissions),
          DJ: getEffectiveRolePermissions("DJ", customRolePermissions),
          OPERATOR: getEffectiveRolePermissions("OPERATOR", customRolePermissions),
        },
        defaultPermissions: {
          OWNER: ROLE_PERMISSIONS.OWNER,
          MANAGER: ROLE_PERMISSIONS.MANAGER,
          DJ: ROLE_PERMISSIONS.DJ,
          OPERATOR: ROLE_PERMISSIONS.OPERATOR,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/v1/team/permissions
 * Guarda la personalización de la lista de permisos asignados para Manager y DJ.
 */
export async function PUT(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    // Solo OWNER o SUPER_ADMIN pueden redefinir la matriz de permisos de los roles
    await requireRole(["OWNER", "SUPER_ADMIN"]);

    const body = await req.json();
    const { rolePermissions, action } = body;

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    let currentSettings: any = {};
    if (tenant?.settings) {
      try {
        currentSettings = JSON.parse(tenant.settings);
      } catch (err) {
        currentSettings = {};
      }
    }

    // Acción para restablecer a valores por defecto
    if (action === "reset") {
      delete currentSettings.rolePermissions;

      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          settings: JSON.stringify(currentSettings),
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: session.sub,
          action: "ROLE_PERMISSIONS_RESET",
          resource: `TENANT:${tenantId}`,
          metadata: JSON.stringify({
            resetBy: session.email,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Permisos de roles restablecidos a los valores recomendados de fábrica.",
        data: {
          isCustomized: false,
          rolePermissions: {
            OWNER: ROLE_PERMISSIONS.OWNER,
            MANAGER: ROLE_PERMISSIONS.MANAGER,
            DJ: ROLE_PERMISSIONS.DJ,
            OPERATOR: ROLE_PERMISSIONS.OPERATOR,
          },
        },
      });
    }

    if (!rolePermissions || typeof rolePermissions !== "object") {
      throw new BadRequestError("Se requiere un objeto rolePermissions válido.");
    }

    const validPermissions = new Set(Object.values(PERMISSIONS));

    // Validar y sanitizar permisos para cada rol personalizable
    const sanitizedMatrix: Record<string, string[]> = {};

    const customizableRoles: Role[] = ["MANAGER", "DJ", "OPERATOR"];
    for (const role of customizableRoles) {
      if (Array.isArray(rolePermissions[role])) {
        const filtered = rolePermissions[role].filter((p: any) =>
          typeof p === "string" && validPermissions.has(p as Permission)
        );
        sanitizedMatrix[role] = Array.from(new Set(filtered));
      } else {
        // Mantener permisos efectivos actuales si no se enviaron
        sanitizedMatrix[role] = getEffectiveRolePermissions(
          role,
          currentSettings.rolePermissions
        );
      }
    }

    currentSettings.rolePermissions = sanitizedMatrix;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: JSON.stringify(currentSettings),
      },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "ROLE_PERMISSIONS_UPDATED",
        resource: `TENANT:${tenantId}`,
        metadata: JSON.stringify({
          updatedBy: session.email,
          managerPermissionsCount: sanitizedMatrix.MANAGER?.length,
          djPermissionsCount: sanitizedMatrix.DJ?.length,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Matriz de roles y permisos actualizada exitosamente.",
      data: {
        isCustomized: true,
        rolePermissions: {
          OWNER: ROLE_PERMISSIONS.OWNER,
          ...sanitizedMatrix,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
