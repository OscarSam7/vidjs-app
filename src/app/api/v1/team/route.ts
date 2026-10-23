import { NextRequest, NextResponse } from "next/server";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  ROLES,
  Role,
  ROLE_DEFINITIONS,
  PERMISSION_DEFINITIONS,
  PERMISSION_CATEGORIES,
  ROLE_PERMISSIONS,
  getEffectiveRolePermissions,
  Permission,
} from "@/lib/rbac/permissions";

/**
 * GET /api/v1/team
 * Lista todos los usuarios/miembros del establecimiento, roles y matriz de permisos.
 */
export async function GET() {
  try {
    const { session, tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    // 1. Obtener todos los miembros del personal asociados a este establecimiento
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        { role: "asc" },
        { createdAt: "asc" },
      ],
    });

    // 2. Obtener configuraciones del Tenant para extraer la matriz de permisos personalizada
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true, name: true },
    });

    let customRolePermissions: Record<string, string[]> | null = null;
    if (tenant?.settings) {
      try {
        const parsed = JSON.parse(tenant.settings);
        if (parsed.rolePermissions) {
          customRolePermissions = parsed.rolePermissions;
        }
      } catch (err) {
        // ignore JSON parse error
      }
    }

    // 3. Matriz efectiva de permisos para cada rol
    const effectiveRolePermissions: Record<string, Permission[]> = {
      OWNER: ROLE_PERMISSIONS.OWNER,
      MANAGER: getEffectiveRolePermissions("MANAGER", customRolePermissions),
      DJ: getEffectiveRolePermissions("DJ", customRolePermissions),
      OPERATOR: getEffectiveRolePermissions("OPERATOR", customRolePermissions),
    };

    return NextResponse.json({
      success: true,
      data: {
        users,
        roles: ROLE_DEFINITIONS,
        permissions: PERMISSION_DEFINITIONS,
        categories: PERMISSION_CATEGORIES,
        rolePermissions: effectiveRolePermissions,
        isCustomized: Boolean(customRolePermissions),
        currentUser: {
          id: session.sub,
          role: session.role,
          email: session.email,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/team
 * Crea un nuevo miembro del equipo (Manager, DJ u Operador) en el establecimiento.
 */
export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const body = await req.json();
    const { name, email, password, role, phone } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      throw new BadRequestError("El nombre del miembro es requerido (mínimo 2 caracteres).");
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      throw new BadRequestError("Debe ingresar un correo electrónico válido.");
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      throw new BadRequestError("La contraseña temporal debe tener al menos 6 caracteres.");
    }

    const normalizedRole = (role || "").toUpperCase() as Role;
    const allowedNewRoles: Role[] = ["MANAGER", "DJ", "OPERATOR"];
    if (!allowedNewRoles.includes(normalizedRole)) {
      throw new BadRequestError("El rol asignado debe ser MANAGER, DJ u OPERATOR.");
    }

    // Restricción: solo OWNER o SUPER_ADMIN pueden crear otro MANAGER
    if (normalizedRole === "MANAGER" && session.role !== "OWNER" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Solo el Propietario (Owner) puede nombrar nuevos Managers.");
    }

    // Verificar si el email ya existe en el sistema
    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existing) {
      throw new BadRequestError("Ya existe una cuenta registrada con este correo electrónico.");
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        role: normalizedRole,
        phone: phone ? String(phone).trim() : null,
        status: "ACTIVE",
        tenantId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "TEAM_MEMBER_CREATED",
        resource: `USER:${newUser.id}`,
        metadata: JSON.stringify({
          createdUser: newUser.email,
          assignedRole: newUser.role,
          createdBy: session.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Miembro ${newUser.name} creado exitosamente con rol ${newUser.role}.`,
      data: newUser,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/v1/team
 * Asigna un nuevo rol, modifica datos o cambia el estado (Activo/Suspendido) de un miembro.
 */
export async function PUT(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const body = await req.json();
    const { userId, role, status, name, phone, password } = body;

    if (!userId || typeof userId !== "string") {
      throw new BadRequestError("El ID del usuario es requerido.");
    }

    // Verificar que el usuario pertenezca al mismo establecimiento
    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!targetUser) {
      throw new NotFoundError("Miembro del equipo no encontrado en este establecimiento.");
    }

    // Seguridad: No permitir auto-cambio de rol ni degradar al OWNER
    if (role && targetUser.id === session.sub) {
      throw new BadRequestError("No puedes cambiar tu propio rol.");
    }

    if (targetUser.role === "OWNER" && session.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("No se puede modificar la cuenta del Propietario (Owner).");
    }

    // Restricción para Manager
    if (session.role === "MANAGER") {
      if (role === "MANAGER" || targetUser.role === "MANAGER") {
        throw new ForbiddenError("Solo el Propietario (Owner) puede promover o modificar Managers.");
      }
    }

    const dataToUpdate: any = {};

    if (role) {
      const normalizedRole = role.toUpperCase() as Role;
      if (!["MANAGER", "DJ", "OPERATOR"].includes(normalizedRole)) {
        throw new BadRequestError("Rol no válido. Opciones: MANAGER, DJ, OPERATOR.");
      }
      dataToUpdate.role = normalizedRole;
    }

    if (status) {
      if (!["ACTIVE", "SUSPENDED"].includes(status)) {
        throw new BadRequestError("Estado no válido. Opciones: ACTIVE, SUSPENDED.");
      }
      dataToUpdate.status = status;
    }

    if (name && typeof name === "string" && name.trim().length >= 2) {
      dataToUpdate.name = name.trim();
    }

    if (phone !== undefined) {
      dataToUpdate.phone = phone ? String(phone).trim() : null;
    }

    if (password && typeof password === "string" && password.length >= 6) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, 10);
      dataToUpdate.tokenVersion = targetUser.tokenVersion + 1; // Invalida sesiones activas
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        status: true,
        updatedAt: true,
      },
    });

    // Auditoría
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: role ? "ROLE_ASSIGNED" : "USER_UPDATED",
        resource: `USER:${updatedUser.id}`,
        metadata: JSON.stringify({
          updatedUser: updatedUser.email,
          previousRole: targetUser.role,
          newRole: updatedUser.role,
          newStatus: updatedUser.status,
          updatedBy: session.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Información de ${updatedUser.name} actualizada correctamente.`,
      data: updatedUser,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/team
 * Elimina o desvincula un miembro del equipo del establecimiento.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "SUPER_ADMIN"]);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      throw new BadRequestError("El ID del usuario es requerido.");
    }

    if (userId === session.sub) {
      throw new BadRequestError("No puedes eliminar tu propia cuenta.");
    }

    const targetUser = await prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!targetUser) {
      throw new NotFoundError("Miembro no encontrado en este establecimiento.");
    }

    if (targetUser.role === "OWNER") {
      throw new ForbiddenError("No se puede eliminar la cuenta del Propietario (Owner).");
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "TEAM_MEMBER_DELETED",
        resource: `USER:${userId}`,
        metadata: JSON.stringify({
          deletedUser: targetUser.email,
          deletedRole: targetUser.role,
          deletedBy: session.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `El miembro ${targetUser.name} (${targetUser.email}) ha sido eliminado.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
