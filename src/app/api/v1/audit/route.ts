import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    // 1. Autorización: Se requiere rol OWNER, MANAGER o SUPER_ADMIN
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(10, parseInt(searchParams.get("limit") || "25", 10)));
    const actionFilter = searchParams.get("action")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const format = searchParams.get("format")?.toLowerCase();

    // 2. Construir cláusula where vinculada al tenant (salvo SUPER_ADMIN sin tenantId)
    const where: any = {};
    if (session.role !== "SUPER_ADMIN" || tenantId) {
      where.tenantId = tenantId;
    }

    if (actionFilter && actionFilter !== "ALL") {
      where.action = actionFilter;
    }

    if (search) {
      where.OR = [
        { action: { contains: search } },
        { resource: { contains: search } },
        { ipAddress: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
      ];
    }

    // Si se solicita exportación en CSV
    if (format === "csv") {
      const allLogs = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 1000,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      const csvHeader = "ID,Fecha,Usuario,Email,Rol,Accion,Recurso,IP,Metadata\n";
      const csvRows = allLogs
        .map((log) => {
          const safeMeta = (log.metadata || "").replace(/"/g, '""');
          return `"${log.id}","${log.createdAt.toISOString()}","${log.user?.name || "Sistema"}","${log.user?.email || "N/A"}","${log.user?.role || "SYSTEM"}","${log.action}","${log.resource || ""}","${log.ipAddress || ""}","${safeMeta}"`;
        })
        .join("\n");

      return new NextResponse(csvHeader + csvRows, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit_logs_${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // 3. Ejecutar consulta paginada y métricas de seguridad
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, logs, total24hLogins, distinctUsers, distinctActions] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.auditLog.count({
        where: {
          ...(where.tenantId ? { tenantId: where.tenantId } : {}),
          action: "AUTH_LOGIN",
          createdAt: { gte: oneDayAgo },
        },
      }),
      prisma.auditLog.groupBy({
        by: ["userId"],
        where: where.tenantId ? { tenantId: where.tenantId } : {},
      }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where: where.tenantId ? { tenantId: where.tenantId } : {},
        _count: { action: true },
        orderBy: { _count: { action: "desc" } },
        take: 8,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: logs.map((log) => {
          let parsedMeta: any = null;
          if (log.metadata) {
            try {
              parsedMeta = JSON.parse(log.metadata);
            } catch {
              parsedMeta = log.metadata;
            }
          }
          return {
            id: log.id,
            action: log.action,
            resource: log.resource,
            resourceId: log.resourceId,
            ipAddress: log.ipAddress,
            userAgent: log.userAgent,
            metadata: parsedMeta,
            createdAt: log.createdAt,
            user: log.user
              ? {
                  id: log.user.id,
                  name: log.user.name,
                  email: log.user.email,
                  role: log.user.role,
                }
              : null,
          };
        }),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
        metrics: {
          totalEvents: total,
          logins24h: total24hLogins,
          uniqueOperators: distinctUsers.length,
          topActions: distinctActions.map((a) => ({
            action: a.action,
            count: a._count.action,
          })),
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
