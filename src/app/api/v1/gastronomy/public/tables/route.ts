import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { handleApiError } from "@/lib/errors";
import { ensureGastronomySeeded } from "@/lib/gastronomy/seed-defaults";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const slug = searchParams.get("slug");
    const explicit = searchParams.get("explicit") === "1";

    const guestSession = await getCurrentGuestSession().catch(() => null);
    const userSession = await getCurrentSession().catch(() => null);

    let tenantId: string | null = null;

    // 1. Prioridad máxima: slug de local explícito elegido por el cliente
    if (slug) {
      const ten = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true },
      });
      if (ten) tenantId = ten.id;
    }

    // 2. Código de evento explícito
    if (!tenantId && code) {
      const ev = await prisma.event.findFirst({
        where: { code: code.toUpperCase() },
        select: { tenantId: true },
      });
      if (ev) tenantId = ev.tenantId;
    }

    // 3. Sesión activa de mesa del cliente
    if (!tenantId && guestSession?.tenant?.id) {
      tenantId = guestSession.tenant.id;
    }

    // 4. Si se pidió modo explícito (sin adivinar local) y no hay local resuelto, devolver vacío
    if (!tenantId && explicit) {
      return NextResponse.json({
        success: true,
        tenant: null,
        sectors: [],
        tables: [],
        activeEvent: null,
      });
    }

    // 5. Fallback legacy para vistas administrativas o accesos directos antiguos
    if (!tenantId && userSession?.tenantId) {
      tenantId = userSession.tenantId;
    }

    if (!tenantId) {
      const mainTenant =
        (await prisma.tenant.findFirst({
          where: { status: "ACTIVE", users: { some: {} } },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        })) ||
        (await prisma.tenant.findFirst({
          where: { status: "ACTIVE" },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        }));
      tenantId = mainTenant?.id || null;
    }

    if (!tenantId) {
      return NextResponse.json({
        success: true,
        tenant: null,
        sectors: [],
        tables: [],
        activeEvent: null,
      });
    }

    await ensureGastronomySeeded(tenantId);

    const [tenantInfo, sectors, tables, activeEvent] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          venues: {
            where: { active: true },
            select: { address: true },
            take: 1,
          },
        },
      }),
      prisma.gastroSector.findMany({
        where: { tenantId, active: true },
        select: { id: true, name: true, colorHex: true },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.table.findMany({
        where: {
          tenantId,
          active: true,
          number: { lt: 90 },
        },
        include: {
          sector: { select: { id: true, name: true, colorHex: true } },
        },
        orderBy: { number: "asc" },
      }),
      prisma.event.findFirst({
        where: { tenantId, status: "ACTIVE" },
        select: { id: true, name: true, code: true },
        orderBy: { startsAt: "desc" },
      }),
    ]);

    const defaultSector = sectors[0] || null;

    const normalizedTables = tables.map((t) => ({
      id: t.id,
      number: t.number,
      label: t.label,
      capacity: t.capacity,
      zone: t.zone,
      qrToken: t.qrToken,
      tableStatus: t.tableStatus,
      isAvailable: t.tableStatus === "AVAILABLE",
      sectorId: t.sector?.id || defaultSector?.id || null,
      sectorName: t.sector?.name || defaultSector?.name || "Salón principal",
      sectorColor: t.sector?.colorHex || defaultSector?.colorHex || "#8B5CF6",
    }));

    const usedSectorIds = new Set(normalizedTables.map((t) => t.sectorId).filter(Boolean));
    const populatedSectors = sectors.filter((s) => usedSectorIds.has(s.id));

    return NextResponse.json({
      success: true,
      tenant: tenantInfo
        ? {
            id: tenantInfo.id,
            name: tenantInfo.name,
            slug: tenantInfo.slug,
            logoUrl: tenantInfo.logoUrl,
            address: tenantInfo.venues?.[0]?.address || null,
          }
        : null,
      sectors: populatedSectors,
      tables: normalizedTables,
      activeEvent: activeEvent || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
