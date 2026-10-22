import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole, getCurrentSession } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

const settingsSchema = z.object({
  general: z.object({
    clubName: z.string().min(2).max(100),
    timezone: z.string().default("America/Montevideo"),
    phone: z.string().optional().default(""),
    address: z.string().optional().default(""),
    currency: z.string().default("USD"),
  }),
  djAudio: z.object({
    crossfaderDurationSec: z.number().min(0).max(15).default(4),
    autoGain: z.boolean().default(true),
    soundEffectsEnabled: z.boolean().default(true),
    autoPlayRequests: z.boolean().default(false),
    allowExplicitLyrics: z.boolean().default(true),
  }),
  requestsFairPlay: z.object({
    maxRequestsPerTable: z.number().min(1).max(20).default(3),
    requestCooldownMinutes: z.number().min(0).max(60).default(5),
    requireDjApproval: z.boolean().default(true),
    allowDedicationNotes: z.boolean().default(true),
    tippingEnabled: z.boolean().default(true),
  }),
  screenPhotos: z.object({
    photoApprovalRequired: z.boolean().default(true),
    photoRotationSeconds: z.number().min(5).max(120).default(15),
    allowSelfies: z.boolean().default(true),
    watermarkEnabled: z.boolean().default(false),
    tvLyricsDisplay: z.boolean().default(true),
  }),
  security: z.object({
    qrAutoRotateOnClose: z.boolean().default(false),
    forceSessionLogoutOnClose: z.boolean().default(true),
    allowMultipleDevicesPerTable: z.boolean().default(true),
  }),
});

export async function GET() {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        venues: {
          select: { id: true, name: true, slug: true, address: true, phone: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundError("Establecimiento no encontrado");
    }

    let parsedSettings: any = {};
    if (tenant.settings) {
      try {
        parsedSettings = JSON.parse(tenant.settings);
      } catch {}
    }

    const mergedSettings = {
      general: {
        clubName: parsedSettings.general?.clubName || tenant.name,
        timezone: parsedSettings.general?.timezone || "America/Montevideo",
        phone: parsedSettings.general?.phone || tenant.venues[0]?.phone || "+598 99 123 456",
        address: parsedSettings.general?.address || tenant.venues[0]?.address || "Av. Principal 123",
        currency: parsedSettings.general?.currency || "USD",
      },
      djAudio: {
        crossfaderDurationSec: parsedSettings.djAudio?.crossfaderDurationSec ?? 4,
        autoGain: parsedSettings.djAudio?.autoGain ?? true,
        soundEffectsEnabled: parsedSettings.djAudio?.soundEffectsEnabled ?? true,
        autoPlayRequests: parsedSettings.djAudio?.autoPlayRequests ?? false,
        allowExplicitLyrics: parsedSettings.djAudio?.allowExplicitLyrics ?? true,
      },
      requestsFairPlay: {
        maxRequestsPerTable: parsedSettings.requestsFairPlay?.maxRequestsPerTable ?? 3,
        requestCooldownMinutes: parsedSettings.requestsFairPlay?.requestCooldownMinutes ?? 5,
        requireDjApproval: parsedSettings.requestsFairPlay?.requireDjApproval ?? true,
        allowDedicationNotes: parsedSettings.requestsFairPlay?.allowDedicationNotes ?? true,
        tippingEnabled: parsedSettings.requestsFairPlay?.tippingEnabled ?? true,
      },
      screenPhotos: {
        photoApprovalRequired: parsedSettings.screenPhotos?.photoApprovalRequired ?? true,
        photoRotationSeconds: parsedSettings.screenPhotos?.photoRotationSeconds ?? 15,
        allowSelfies: parsedSettings.screenPhotos?.allowSelfies ?? true,
        watermarkEnabled: parsedSettings.screenPhotos?.watermarkEnabled ?? false,
        tvLyricsDisplay: parsedSettings.screenPhotos?.tvLyricsDisplay ?? true,
      },
      security: {
        qrAutoRotateOnClose: parsedSettings.security?.qrAutoRotateOnClose ?? false,
        forceSessionLogoutOnClose: parsedSettings.security?.forceSessionLogoutOnClose ?? true,
        allowMultipleDevicesPerTable: parsedSettings.security?.allowMultipleDevicesPerTable ?? true,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        settings: mergedSettings,
        venues: tenant.venues,
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
    const validated = settingsSchema.parse(body);

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

    // Actualizar sección de settings preservando branding u otras configuraciones
    const newSettings = {
      ...existingSettings,
      ...validated,
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: validated.general.clubName,
        settings: JSON.stringify(newSettings),
      },
    });

    // Registrar en AuditLog para máxima transparencia
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: session?.sub,
        action: "TENANT_SETTINGS_UPDATED",
        resource: `TENANT:${tenantId}`,
        metadata: JSON.stringify({
          updatedBy: session?.email,
          role: session?.role,
          sections: Object.keys(validated),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Configuración del establecimiento guardada exitosamente.",
      data: validated,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
