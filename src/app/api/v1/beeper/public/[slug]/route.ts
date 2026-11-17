import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getBeeperConfig } from "@/lib/beeper/beeper-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(req.url);
    const shortCode = searchParams.get("code")?.trim();

    // 1. Buscar Venue o Tenant por slug
    let venue = await prisma.venue.findFirst({
      where: { slug: { equals: slug, mode: "insensitive" } },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, logoUrl: true, settings: true },
        },
      },
    });

    let tenantId = venue?.tenantId;
    let tenantName = venue?.name || venue?.tenant.name || "Local Gastronómico";
    let tenantLogo = venue?.tenant.logoUrl || null;
    let brandingColors: any = null;

    if (!venue) {
      // Intentar buscar por tenant slug
      const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, name: true, slug: true, logoUrl: true, settings: true },
      });

      if (!tenant) {
        return NextResponse.json(
          { success: false, error: "Local no encontrado para este enlace" },
          { status: 404 }
        );
      }

      tenantId = tenant.id;
      tenantName = tenant.name;
      tenantLogo = tenant.logoUrl;

      try {
        if (tenant.settings) {
          const parsed = JSON.parse(tenant.settings);
          brandingColors = parsed.branding || null;
        }
      } catch {}
    } else {
      try {
        if (venue.settings) {
          const parsed = JSON.parse(venue.settings);
          brandingColors = parsed.branding || null;
        } else if (venue.tenant.settings) {
          const parsed = JSON.parse(venue.tenant.settings);
          brandingColors = parsed.branding || null;
        }
      } catch {}
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: "Local no válido" }, { status: 400 });
    }

    const config = await getBeeperConfig(tenantId, venue?.id);

    // 2. Si se buscó por código corto (ej: ?code=104)
    let foundTicket = null;
    if (shortCode) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      foundTicket = await prisma.beeperTicket.findFirst({
        where: {
          tenantId,
          shortCode,
          status: { in: ["PREPARING", "READY", "ACKNOWLEDGED"] },
          createdAt: { gte: today },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenantId,
          name: tenantName,
          slug,
          logoUrl: tenantLogo,
          branding: brandingColors,
          venueAddress: venue?.address || null,
          venuePhone: venue?.phone || null,
        },
        config,
        foundTicket,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener datos públicos del local" },
      { status: 500 }
    );
  }
}
