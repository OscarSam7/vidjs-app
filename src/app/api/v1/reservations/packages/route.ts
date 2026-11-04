import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";

const decorationSchema = z.object({
  name: z.string().min(1, "El nombre de la decoración es obligatorio"),
  description: z.string().optional(),
  imageUrl: z.string().min(1, "La foto de la decoración es obligatoria"),
  extraPriceCents: z.coerce.number().int().min(0).default(0),
});

const createPackageSchema = z.object({
  venueId: z.string().optional(),
  name: z.string().min(2, "El nombre del paquete es obligatorio"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  itemsIncluded: z.array(z.string()).default([]),
  pricingType: z.enum(["CLEAN_FEE", "CREDIT_CONSUMPTION", "FIXED_COMBO"]).default("FIXED_COMBO"),
  priceCents: z.coerce.number().int().min(0),
  creditAmountCents: z.coerce.number().int().min(0).default(0),
  maxGuests: z.coerce.number().int().min(1).default(8),
  isBirthdayPackage: z.boolean().default(false),
  allowScreenShoutout: z.boolean().default(true),
  colorHex: z.string().default("#8B5CF6"),
  decorations: z.array(decorationSchema).default([]),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");

    const packages = await prisma.reservationPackage.findMany({
      where: {
        tenantId,
        ...(venueId ? { venueId } : {}),
      },
      include: {
        decorations: {
          where: { active: true },
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: { reservations: true },
        },
      },
      orderBy: [{ orderIndex: "asc" }, { createdAt: "desc" }],
    });

    const parsedPackages = packages.map((pkg) => {
      let items: string[] = [];
      try {
        items = JSON.parse(pkg.itemsIncluded);
      } catch {
        items = pkg.itemsIncluded ? [pkg.itemsIncluded] : [];
      }
      return {
        ...pkg,
        itemsIncluded: items,
      };
    });

    return NextResponse.json({
      success: true,
      packages: parsedPackages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const body = await req.json();
    const data = createPackageSchema.parse(body);

    // Si no se especificó venueId, buscar el primer venue del tenant
    let venueId = data.venueId;
    if (!venueId) {
      const defaultVenue = await prisma.venue.findFirst({
        where: { tenantId },
        select: { id: true },
      });
      venueId = defaultVenue?.id;
    }

    const newPackage = await prisma.reservationPackage.create({
      data: {
        tenantId,
        venueId,
        name: data.name,
        description: data.description || null,
        imageUrl: data.imageUrl || null,
        itemsIncluded: JSON.stringify(data.itemsIncluded),
        pricingType: data.pricingType,
        priceCents: data.priceCents,
        creditAmountCents: data.pricingType === "CREDIT_CONSUMPTION" ? data.creditAmountCents : 0,
        maxGuests: data.maxGuests,
        isBirthdayPackage: data.isBirthdayPackage,
        allowScreenShoutout: data.allowScreenShoutout,
        colorHex: data.colorHex,
        decorations: {
          create: data.decorations.map((d, idx) => ({
            tenantId,
            name: d.name,
            description: d.description || null,
            imageUrl: d.imageUrl,
            extraPriceCents: d.extraPriceCents || 0,
            orderIndex: idx,
          })),
        },
      },
      include: {
        decorations: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Paquete creado exitosamente con sus opciones de decoración",
      package: {
        ...newPackage,
        itemsIncluded: data.itemsIncluded,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
