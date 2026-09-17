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
      },
      orderBy: [{ venueId: "asc" }, { number: "asc" }],
    });

    // Generar QR para cada mesa
    const tablesWithQr = await Promise.all(
      tables.map(async (table) => {
        const qrUrl = `${origin}/qr/${table.qrToken}`;
        const [dataUrl, svg] = await Promise.all([
          generateQrDataUrl(qrUrl),
          generateQrSvg(qrUrl),
        ]);

        return {
          ...table,
          scanUrl: qrUrl,
          qrDataUrl: dataUrl,
          qrSvg: svg,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: tablesWithQr,
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
