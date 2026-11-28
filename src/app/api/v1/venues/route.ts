import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError, BadRequestError, NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/venues
 * Retorna las sedes / locales físicos del establecimiento
 */
export async function GET() {
  try {
    const { tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN", "DJ", "OPERATOR"]);

    const venues = await prisma.venue.findMany({
      where: { tenantId, active: true },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        whatsappNumber: true,
        googleReviewUrl: true,
        active: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      venues,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/v1/venues
 * Actualiza los datos de una sede / local físico (nombre, dirección, teléfono, whatsapp, etc.)
 */
export async function PUT(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const body = await req.json();
    const { id, name, address, phone, whatsappNumber, googleReviewUrl } = body;

    if (!id || typeof id !== "string") {
      throw new BadRequestError("El ID de la sede es requerido para actualizar.");
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      throw new BadRequestError("El nombre de la sede es requerido (mínimo 2 caracteres).");
    }

    const existingVenue = await prisma.venue.findFirst({
      where: { id, tenantId },
    });

    if (!existingVenue) {
      throw new NotFoundError("Sede / local no encontrado en este establecimiento.");
    }

    const updated = await prisma.venue.update({
      where: { id },
      data: {
        name: name.trim(),
        address: address !== undefined ? (address ? String(address).trim() : null) : undefined,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : undefined,
        whatsappNumber:
          whatsappNumber !== undefined ? (whatsappNumber ? String(whatsappNumber).trim() : null) : undefined,
        googleReviewUrl:
          googleReviewUrl !== undefined ? (googleReviewUrl ? String(googleReviewUrl).trim() : null) : undefined,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        whatsappNumber: true,
        googleReviewUrl: true,
        active: true,
      },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "VENUE_UPDATE",
        resource: `VENUE:${updated.id}`,
        metadata: JSON.stringify({
          venueName: updated.name,
          address: updated.address,
          updatedBy: session.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sede '${updated.name}' actualizada correctamente.`,
      venue: updated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/venues
 * Crea una nueva sede / sucursal para el establecimiento
 */
export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const body = await req.json();
    const { name, address, phone, whatsappNumber, googleReviewUrl } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      throw new BadRequestError("El nombre de la sede es obligatorio (mínimo 2 caracteres).");
    }

    // Generar slug limpio
    const baseSlug = name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20);

    const slug = `${baseSlug || "sede"}-${Math.floor(100 + Math.random() * 900)}`;

    const newVenue = await prisma.venue.create({
      data: {
        tenantId,
        name: name.trim(),
        slug,
        address: address ? String(address).trim() : null,
        phone: phone ? String(phone).trim() : null,
        whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : null,
        googleReviewUrl: googleReviewUrl ? String(googleReviewUrl).trim() : null,
        active: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        phone: true,
        whatsappNumber: true,
        googleReviewUrl: true,
        active: true,
      },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session.sub,
        action: "VENUE_CREATE",
        resource: `VENUE:${newVenue.id}`,
        metadata: JSON.stringify({
          venueName: newVenue.name,
          slug: newVenue.slug,
          createdBy: session.email,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Sede '${newVenue.name}' creada exitosamente.`,
      venue: newVenue,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
