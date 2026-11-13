import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  try {
    // 1. Autorización Estricta: Solo OWNER, MANAGER o SUPER_ADMIN
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(5, parseInt(searchParams.get("limit") || "20", 10)));
    const status = searchParams.get("status")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";
    const priority = searchParams.get("priority")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";

    // 2. Construir cláusula where
    const where: any = {};
    if (session.role !== "SUPER_ADMIN" || tenantId) {
      where.tenantId = tenantId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (type && type !== "ALL") {
      where.type = type;
    }

    if (priority && priority !== "ALL") {
      where.priority = priority;
    }

    if (category && category !== "ALL") {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { comment: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { customerPhone: { contains: search, mode: "insensitive" } },
        { tableNumber: { contains: search, mode: "insensitive" } },
        { tableName: { contains: search, mode: "insensitive" } },
        { subject: { contains: search, mode: "insensitive" } },
      ];
    }

    // 3. Ejecutar consultas en paralelo
    const [total, rawTickets, summaryCounts] = await Promise.all([
      prisma.qsrTicket.count({ where }),
      prisma.qsrTicket.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.qsrTicket.groupBy({
        by: ["status"],
        where: session.role !== "SUPER_ADMIN" || tenantId ? { tenantId } : {},
        _count: { id: true },
      }),
    ]);

    // Parsear notas internas en JSON
    const tickets = rawTickets.map((t) => {
      let parsedNotes = [];
      try {
        if (t.internalNotes) {
          parsedNotes = JSON.parse(t.internalNotes);
        }
      } catch {
        parsedNotes = [];
      }
      return {
        ...t,
        internalNotes: parsedNotes,
      };
    });

    const statusMap: Record<string, number> = {};
    summaryCounts.forEach((s) => {
      statusMap[s.status] = s._count.id;
    });

    // Calcular estadísticas adicionales rápidas
    const urgentCount = await prisma.qsrTicket.count({
      where: {
        ...(session.role !== "SUPER_ADMIN" || tenantId ? { tenantId } : {}),
        status: { in: ["PENDING", "IN_PROGRESS"] },
        priority: "URGENT",
      },
    });

    return NextResponse.json({
      tickets,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        pending: statusMap["PENDING"] || 0,
        inProgress: statusMap["IN_PROGRESS"] || 0,
        resolved: statusMap["RESOLVED"] || 0,
        archived: statusMap["ARCHIVED"] || 0,
        urgentActive: urgentCount,
      },
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Acceso denegado. Este buzón es confidencial para Gerencia y Dueño." },
        { status: 403 }
      );
    }
    console.error("[QSR GET ERROR]", error);
    return NextResponse.json(
      { error: "Error al cargar los tickets del Buzón QSR." },
      { status: 500 }
    );
  }
}
