import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  allowCompanions: z.boolean().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

const reserveSpotSchema = z.object({
  action: z.literal("RESERVE_SPOT"),
  rsvpId: z.string().min(4),
});

function safeParseSettings(raw?: string | null): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const { tenantId } = await requireTenantContext();
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        subscription: {
          select: { plan: { select: { code: true } } },
        },
        privatePartyRsvps: {
          orderBy: { createdAt: "desc" },
          take: 100,
        },
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    const settings = safeParseSettings(tenant.settings);
    const allowCompanions =
      typeof settings?.partyInvite?.allowCompanions === "boolean"
        ? settings.partyInvite.allowCompanions
        : true;
    const visibility: "PUBLIC" | "PRIVATE" =
      settings?.partyInvite?.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC";
    const isPersonalParty =
      tenant.subscription?.plan?.code === "PERSONAL" || settings?.isPersonalParty === true;

    const rsvps = tenant.privatePartyRsvps || [];
    const confirmedCount = rsvps.length;
    const totalPeopleCount = rsvps.reduce((acc, r) => acc + (r.hasCompanion ? 2 : 1), 0);

    return NextResponse.json({
      success: true,
      tenantName: tenant.name,
      isPersonalParty,
      allowCompanions,
      visibility,
      confirmedCount,
      totalPeopleCount,
      rsvps,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos de configuración" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // Preservar TODAS las demás configuraciones intactas y actualizar únicamente partyInvite
    const currentSettings = safeParseSettings(tenant.settings);
    const currentPartyInvite =
      currentSettings.partyInvite && typeof currentSettings.partyInvite === "object"
        ? currentSettings.partyInvite
        : {};

    const nextAllowCompanions =
      typeof parsed.data.allowCompanions === "boolean"
        ? parsed.data.allowCompanions
        : typeof currentPartyInvite.allowCompanions === "boolean"
        ? currentPartyInvite.allowCompanions
        : true;

    const nextVisibility: "PUBLIC" | "PRIVATE" =
      parsed.data.visibility
        ? parsed.data.visibility
        : currentPartyInvite.visibility === "PRIVATE"
        ? "PRIVATE"
        : "PUBLIC";

    const nextSettings = {
      ...currentSettings,
      partyInvite: {
        ...currentPartyInvite,
        allowCompanions: nextAllowCompanions,
        visibility: nextVisibility,
      },
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: JSON.stringify(nextSettings) },
    });

    return NextResponse.json({
      success: true,
      allowCompanions: nextAllowCompanions,
      visibility: nextVisibility,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: El anfitrión confirma y avisa al invitado que su lugar ya está reservado
export async function POST(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const body = await req.json();
    const parsed = reserveSpotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }

    const [tenant, existing] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true },
      }),
      prisma.privatePartyRsvp.findFirst({
        where: { id: parsed.data.rsvpId, tenantId },
      }),
    ]);

    if (!tenant || !existing) {
      return NextResponse.json({ error: "Invitado no encontrado" }, { status: 404 });
    }

    const updated = await prisma.privatePartyRsvp.update({
      where: { id: existing.id },
      data: {
        status: "CONFIRMED",
        notifiedAt: new Date(),
      },
    });

    const companionText =
      updated.hasCompanion && updated.companionName
        ? ` junto a ${updated.companionName}`
        : "";
    const msg = encodeURIComponent(
      `🎉 ¡Hola ${updated.guestName}! Te confirmamos desde ${tenant.name} que tu lugar ya está reservado para vos${companionText}. ¡Te esperamos!`
    );
    const cleanPhone = (updated.guestPhone || "").replace(/[^0-9]/g, "");
    const whatsappUrl = cleanPhone
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`
      : `https://api.whatsapp.com/send?text=${msg}`;

    return NextResponse.json({
      success: true,
      rsvp: updated,
      whatsappUrl,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
