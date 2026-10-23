import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { generateQrDataUrl, generateQrSvg } from "@/lib/qr/generator";
import { handleApiError } from "@/lib/errors";
import { assertTenantQuota } from "@/lib/billing/limits";

const createTableSchema = z.object({
  venueId: z.string().min(1, "El local es obligatorio"),
  number: z.coerce.number().int().positive("El número de mesa debe ser positivo"),
  label: z.string().min(1, "La etiqueta es obligatoria"),
  capacity: z.coerce.number().int().default(4),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");
    const origin = new URL(req.url).origin;

    const whereClause: any = { tenantId };
    if (venueId) {
      whereClause.venueId = venueId;
    }

    const tables = await prisma.table.findMany({
      where: whereClause,
      include: {
        venue: {
          select: { id: true, name: true },
        },
        guestSessions: {
          where: { expiresAt: { gt: new Date() } },
          select: {
            id: true,
            guestName: true,
            deviceFingerprint: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        songRequests: {
          where: { status: { in: ["PENDING", "ACCEPTED", "PLAYING"] } },
          select: {
            id: true,
            status: true,
            customTitle: true,
            customArtist: true,
            song: { select: { title: true } },
          },
          take: 5,
        },
      },
      orderBy: [{ venueId: "asc" }, { number: "asc" }],
    });

    // Buscar evento activo relevante para pedidos en sala
    const activeEvent = await prisma.event.findFirst({
      where: {
        tenantId,
        status: "ACTIVE",
        ...(venueId ? { venueId } : {}),
      },
      select: { id: true, name: true, code: true, venueId: true },
      orderBy: { startsAt: "desc" },
    });

    // Generar QR y calcular estado de ocupación para cada mesa
    const tablesWithQr = await Promise.all(
      tables.map(async (table) => {
        const qrUrl = `${origin}/qr/${table.qrToken}`;
        const [dataUrl, svg] = await Promise.all([
          generateQrDataUrl(qrUrl),
          generateQrSvg(qrUrl),
        ]);

        const activeSession = table.guestSessions?.[0] || null;
        let occupancyStatus: "LIBRE" | "OCUPADA_STAFF" | "OCUPADA_QR" = "LIBRE";
        let staffName: string | null = null;
        let staffRole: string | null = null;
        let customerReference: string | null = null;

        if (activeSession) {
          if (
            activeSession.deviceFingerprint?.startsWith("STAFF_MANUAL") ||
            activeSession.deviceFingerprint?.startsWith("STAFF_ASSIGNED")
          ) {
            occupancyStatus = "OCUPADA_STAFF";
            const parts = activeSession.deviceFingerprint.split(":");
            staffRole = parts[1] || null;
            staffName = parts[2] || null;
            customerReference = parts[3] || null;
          } else {
            occupancyStatus = "OCUPADA_QR";
          }
        }

        return {
          id: table.id,
          tenantId: table.tenantId,
          venueId: table.venueId,
          number: table.number,
          label: table.label,
          qrToken: table.qrToken,
          qrCodeUrl: table.qrCodeUrl,
          capacity: table.capacity,
          zone: table.zone,
          active: table.active,
          createdAt: table.createdAt,
          updatedAt: table.updatedAt,
          venue: table.venue,
          scanUrl: qrUrl,
          qrDataUrl: dataUrl,
          qrSvg: svg,
          occupancy: {
            status: occupancyStatus,
            staffName,
            staffRole,
            customerReference,
            guestName: activeSession?.guestName || null,
            assignedAt: activeSession?.createdAt ? activeSession.createdAt.toISOString() : null,
            activeRequestsCount: table.songRequests?.length || 0,
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: tablesWithQr,
      activeEvent: activeEvent || null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();

    const body = await req.json();
    const data = createTableSchema.parse(body);

    // Verificar que el venue pertenezca al tenant
    const venue = await prisma.venue.findFirst({
      where: { id: data.venueId, tenantId },
    });

    if (!venue) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "El local no pertenece a tu establecimiento" } },
        { status: 403 }
      );
    }

    // Verificar cuota de mesas permitidas según el plan de suscripción activo
    await assertTenantQuota(tenantId, "tables");

    // Generar token único de QR
    const qrToken = `qr_${venue.slug}_m${data.number}_${Math.random().toString(36).substring(2, 7)}`;

    const newTable = await prisma.table.create({
      data: {
        tenantId,
        venueId: data.venueId,
        number: data.number,
        label: data.label,
        qrToken,
        capacity: data.capacity,
        active: true,
      },
      include: {
        venue: { select: { name: true } },
      },
    });

    const origin = new URL(req.url).origin;
    const qrUrl = `${origin}/qr/${newTable.qrToken}`;
    const qrDataUrl = await generateQrDataUrl(qrUrl);

    return NextResponse.json({
      success: true,
      data: {
        ...newTable,
        scanUrl: qrUrl,
        qrDataUrl,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
