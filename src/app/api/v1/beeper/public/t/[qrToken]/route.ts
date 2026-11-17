import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getBeeperConfig } from "@/lib/beeper/beeper-service";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ qrToken: string }> }
) {
  try {
    const { qrToken } = await params;

    const ticket = await prisma.beeperTicket.findUnique({
      where: { qrToken },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, logoUrl: true, settings: true },
        },
        venue: {
          select: { id: true, name: true, slug: true, address: true, phone: true, settings: true },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: "Llamador no encontrado o expirado" },
        { status: 404 }
      );
    }

    const config = await getBeeperConfig(ticket.tenantId, ticket.venueId || undefined);

    let brandingColors: any = null;
    try {
      if (ticket.venue?.settings) {
        const parsed = JSON.parse(ticket.venue.settings);
        brandingColors = parsed.branding || null;
      } else if (ticket.tenant.settings) {
        const parsed = JSON.parse(ticket.tenant.settings);
        brandingColors = parsed.branding || null;
      }
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          shortCode: ticket.shortCode,
          qrToken: ticket.qrToken,
          customerName: ticket.customerName,
          tableOrOrderNumber: ticket.tableOrOrderNumber,
          status: ticket.status,
          ringCount: ticket.ringCount,
          lastRingAt: ticket.lastRingAt,
          estimatedReadyAt: ticket.estimatedReadyAt,
          readyAt: ticket.readyAt,
          deliveredAt: ticket.deliveredAt,
          rating: ticket.rating,
          createdAt: ticket.createdAt,
        },
        tenant: {
          id: ticket.tenant.id,
          name: ticket.venue?.name || ticket.tenant.name,
          slug: ticket.venue?.slug || ticket.tenant.slug,
          logoUrl: ticket.tenant.logoUrl,
          branding: brandingColors,
        },
        config,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener estado del llamador" },
      { status: 500 }
    );
  }
}
