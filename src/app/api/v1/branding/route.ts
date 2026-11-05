import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole, getCurrentSession } from "@/lib/auth/session";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import {
  brandingSchema,
  getMergedBranding,
  THEME_PRESETS,
  DEFAULT_BRANDING,
} from "@/lib/branding/config";

const updateBrandingSchema = z.object({
  target: z.enum(["TENANT", "VENUE"]),
  venueId: z.string().optional(),
  branding: brandingSchema,
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");
    const code = searchParams.get("code")?.trim().toUpperCase();
    const tenantSlug = searchParams.get("tenant");
    const requestedTenantId = searchParams.get("tenantId");

    let tenantId: string | null = null;
    if (code) {
      const event = await prisma.event.findUnique({
        where: { code },
        select: { tenantId: true, venueId: true },
      });
      if (event) {
        tenantId = event.tenantId;
      }
    } else if (tenantSlug) {
      const t = await prisma.tenant.findUnique({
        where: { slug: tenantSlug },
        select: { id: true },
      });
      if (t) tenantId = t.id;
    } else if (requestedTenantId) {
      tenantId = requestedTenantId;
    }

    if (!tenantId) {
      const auth = await requireTenantContext();
      tenantId = auth.tenantId;
    }

    // 1. Obtener Tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        venues: {
          select: { id: true, name: true, slug: true, settings: true },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundError("Establecimiento no encontrado");
    }

    // 2. Obtener Venue específico si se pasó venueId
    let targetVenue = null;
    if (venueId) {
      targetVenue = tenant.venues.find((v) => v.id === venueId);
      if (!targetVenue) {
        throw new NotFoundError("Local no encontrado en este establecimiento");
      }
    }

    // 3. Resolver branding en cascada
    const resolved = getMergedBranding(
      tenant.settings,
      targetVenue?.settings,
      targetVenue?.name || tenant.name,
      tenant.logoUrl
    );

    // Parsing seguro de settings de Tenant
    let tenantBranding = {};
    if (tenant.settings) {
      try {
        const parsed = JSON.parse(tenant.settings);
        tenantBranding = parsed.branding || parsed;
      } catch {}
    }

    // Parsing seguro de settings de Venue
    let venueBranding = {};
    if (targetVenue?.settings) {
      try {
        const parsed = JSON.parse(targetVenue.settings);
        venueBranding = parsed.branding || parsed;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      data: {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          logoUrl: tenant.logoUrl,
          branding: tenantBranding,
        },
        venue: targetVenue
          ? {
              id: targetVenue.id,
              name: targetVenue.name,
              branding: venueBranding,
            }
          : null,
        venues: tenant.venues.map((v) => ({ id: v.id, name: v.name, slug: v.slug })),
        resolved,
        presets: Object.values(THEME_PRESETS),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();
    const session = await getCurrentSession();

    const body = await req.json();
    const parsed = updateBrandingSchema.parse(body);

    if (parsed.target === "VENUE") {
      if (!parsed.venueId) {
        throw new BadRequestError("Se requiere el campo venueId para personalizar un local");
      }

      const venue = await prisma.venue.findFirst({
        where: { id: parsed.venueId, tenantId },
      });

      if (!venue) {
        throw new NotFoundError("El local indicado no pertenece a este establecimiento");
      }

      // Guardar en venue.settings
      let existingSettings: Record<string, any> = {};
      if (venue.settings) {
        try {
          existingSettings = JSON.parse(venue.settings);
        } catch {}
      }

      existingSettings.branding = parsed.branding;

      await prisma.venue.update({
        where: { id: venue.id },
        data: {
          settings: JSON.stringify(existingSettings),
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: session?.sub,
          action: "VENUE_BRANDING_UPDATED",
          resource: `VENUE:${venue.id}`,
          metadata: JSON.stringify({ venueName: venue.name, theme: parsed.branding.themePreset }),
        },
      });
    } else {
      // Guardar a nivel TENANT
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new NotFoundError("Establecimiento no encontrado");
      }

      let existingSettings: Record<string, any> = {};
      if (tenant.settings) {
        try {
          existingSettings = JSON.parse(tenant.settings);
        } catch {}
      }

      existingSettings.branding = parsed.branding;

      // Actualizar también tenant.logoUrl nativo si viene informado
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          settings: JSON.stringify(existingSettings),
          logoUrl: parsed.branding.logoUrl !== undefined ? parsed.branding.logoUrl : tenant.logoUrl,
        },
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: session?.sub,
          action: "TENANT_BRANDING_UPDATED",
          resource: `TENANT:${tenantId}`,
          metadata: JSON.stringify({ theme: parsed.branding.themePreset }),
        },
      });
    }

    // Emitir en tiempo real a todas las pantallas de TV, cabinas y comensales conectados
    try {
      const events = await prisma.event.findMany({
        where: parsed.target === "VENUE" && parsed.venueId ? { venueId: parsed.venueId } : { tenantId },
        select: { id: true, code: true },
      });
      for (const ev of events) {
        realtimeBus.broadcast(ev.id, "BRANDING_UPDATED", parsed.branding);
        if (ev.code) {
          realtimeBus.broadcast(ev.code, "BRANDING_UPDATED", parsed.branding);
        }
      }
    } catch (e) {
      console.warn("No se pudo emitir evento de branding en tiempo real:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Personalización de marca guardada exitosamente",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
