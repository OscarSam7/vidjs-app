import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  allowCompanions: z.boolean(),
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
    const isPersonalParty =
      tenant.subscription?.plan?.code === "PERSONAL" || settings?.isPersonalParty === true;

    const rsvps = tenant.privatePartyRsvps || [];
    const confirmedCount = rsvps.length;
    const totalPeopleCount = rsvps.reduce((acc, r) => acc + (r.hasCompanion ? 2 : 1), 0);

    return NextResponse.json({
      success: true,
      isPersonalParty,
      allowCompanions,
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
      return NextResponse.json({ error: "Valor inválido para allowCompanions" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant no encontrado" }, { status: 404 });
    }

    // Preservar TODAS las demás configuraciones intactas y actualizar únicamente partyInvite.allowCompanions
    const currentSettings = safeParseSettings(tenant.settings);
    const nextSettings = {
      ...currentSettings,
      partyInvite: {
        ...(currentSettings.partyInvite && typeof currentSettings.partyInvite === "object"
          ? currentSettings.partyInvite
          : {}),
        allowCompanions: parsed.data.allowCompanions,
      },
    };

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: JSON.stringify(nextSettings) },
    });

    return NextResponse.json({
      success: true,
      allowCompanions: parsed.data.allowCompanions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
