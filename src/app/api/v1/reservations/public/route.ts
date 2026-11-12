import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const venueSlug = searchParams.get("venue");
    const dateParam = searchParams.get("date"); // YYYY-MM-DD

    // 1. Resolver Venue / Tenant
    let venue: any = null;
    if (venueSlug) {
      venue = await prisma.venue.findFirst({
        where: {
          OR: [{ id: venueSlug }, { tenant: { slug: venueSlug } }],
        },
        include: {
          tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
          tables: {
            where: { active: true },
            select: { id: true, number: true, label: true, capacity: true, zone: true },
            orderBy: { number: "asc" },
          },
        },
      });
    }

    // Si no se pasó slug o no se encontró, tomar la primera sede activa del establecimiento principal
    if (!venue) {
      venue =
        (await prisma.venue.findFirst({
          where: {
            active: true,
            tenant: { status: "ACTIVE", users: { some: {} } },
            tables: { some: { active: true, number: { lt: 90 } } },
          },
          include: {
            tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
            tables: {
              where: { active: true, number: { lt: 90 } },
              select: { id: true, number: true, label: true, capacity: true, zone: true, tableStatus: true },
              orderBy: { number: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        })) ||
        (await prisma.venue.findFirst({
          where: { active: true },
          include: {
            tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
            tables: {
              where: { active: true, number: { lt: 90 } },
              select: { id: true, number: true, label: true, capacity: true, zone: true, tableStatus: true },
              orderBy: { number: "asc" },
            },
          },
          orderBy: { createdAt: "asc" },
        }));
    }

    if (!venue) {
      return NextResponse.json(
        { success: false, error: { message: "No se encontró ninguna sede configurada" } },
        { status: 404 }
      );
    }

    // 2. Obtener paquetes activos con sus decoraciones (incluyendo fotos reales)
    const packages = await prisma.reservationPackage.findMany({
      where: {
        tenantId: venue.tenantId,
        active: true,
      },
      include: {
        decorations: {
          where: { active: true },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: [{ isBirthdayPackage: "desc" }, { orderIndex: "asc" }],
    });

    const parsedPackages = packages.map((pkg) => {
      let itemsIncluded: string[] = [];
      try {
        itemsIncluded = JSON.parse(pkg.itemsIncluded);
      } catch {
        itemsIncluded = [];
      }
      return {
        ...pkg,
        itemsIncluded,
      };
    });

    // 3. Obtener evento activo para esa fecha (si existe)
    let activeEvent = null;
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    activeEvent = await prisma.event.findFirst({
      where: {
        venueId: venue.id,
        startsAt: { lte: endOfDay },
        endsAt: { gte: startOfDay },
        status: { in: ["ACTIVE", "PUBLISHED"] },
      },
      select: { id: true, name: true, code: true, bannerUrl: true },
    });

    return NextResponse.json({
      success: true,
      venue: {
        id: venue.id,
        name: venue.name,
        tenantName: venue.tenant.name,
        tenantSlug: venue.tenant.slug,
        logoUrl: venue.tenant.logoUrl,
        bankName: venue.bankName,
        bankAccount: venue.bankAccount,
        bankHolder: venue.bankHolder,
        bankTaxId: venue.bankTaxId,
        bankAlias: venue.bankAlias,
        whatsappNumber: venue.whatsappNumber,
        tables: venue.tables,
      },
      activeEvent,
      packages: parsedPackages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
