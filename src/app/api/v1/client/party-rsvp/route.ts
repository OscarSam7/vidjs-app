import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const rsvpSchema = z.object({
  tenantSlug: z.string().min(2, "Evento no especificado"),
  guestName: z.string().min(2, "Ingresa tu nombre completo"),
  guestPhone: z.string().optional().or(z.literal("")),
  hasCompanion: z.boolean().optional().default(false),
  companionName: z.string().optional().or(z.literal("")),
  note: z.string().max(240).optional().or(z.literal("")),
});

function parsePartyInviteSettings(rawSettings?: string | null): {
  allowCompanions: boolean;
  visibility: "PUBLIC" | "PRIVATE";
} {
  if (!rawSettings) return { allowCompanions: true, visibility: "PUBLIC" };
  try {
    const parsed = JSON.parse(rawSettings);
    const allowCompanions =
      typeof parsed?.partyInvite?.allowCompanions === "boolean"
        ? parsed.partyInvite.allowCompanions
        : true;
    const visibility = parsed?.partyInvite?.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC";
    return { allowCompanions, visibility };
  } catch {
    return { allowCompanions: true, visibility: "PUBLIC" };
  }
}

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug")?.trim();
    if (!slug) {
      return NextResponse.json({ error: "Parámetro slug requerido" }, { status: 400 });
    }

    let tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        privatePartyRsvps: {
          select: { id: true, hasCompanion: true },
        },
      },
    });

    if (!tenant) {
      const ev = await prisma.event.findFirst({
        where: { code: slug.toUpperCase() },
        select: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
              settings: true,
              privatePartyRsvps: {
                select: { id: true, hasCompanion: true },
              },
            },
          },
        },
      });
      if (ev?.tenant) {
        tenant = ev.tenant;
      }
    }

    if (!tenant) {
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const { allowCompanions, visibility } = parsePartyInviteSettings(tenant.settings);
    const confirmedCount = tenant.privatePartyRsvps.length;
    const totalPeopleCount = tenant.privatePartyRsvps.reduce(
      (acc, r) => acc + (r.hasCompanion ? 2 : 1),
      0
    );

    return NextResponse.json({
      success: true,
      allowCompanions,
      visibility,
      confirmedCount,
      totalPeopleCount,
    });
  } catch (error) {
    console.error("[PARTY_RSVP_GET_ERROR]", error);
    return NextResponse.json({ error: "Error consultando confirmación" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = rsvpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Datos inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    let tenant = await prisma.tenant.findUnique({
      where: { slug: d.tenantSlug },
      select: { id: true, name: true, slug: true, settings: true },
    });

    if (!tenant) {
      const ev = await prisma.event.findFirst({
        where: { code: d.tenantSlug.toUpperCase() },
        select: { tenant: { select: { id: true, name: true, slug: true, settings: true } } },
      });
      if (ev?.tenant) {
        tenant = ev.tenant;
      }
    }

    if (!tenant) {
      return NextResponse.json({ error: "Fiesta o evento no encontrado" }, { status: 404 });
    }

    const { allowCompanions, visibility } = parsePartyInviteSettings(tenant.settings);
    const wantsCompanion = Boolean(d.hasCompanion);

    if (wantsCompanion && !allowCompanions) {
      return NextResponse.json(
        { error: "Esta invitación es personal y no permite agregar acompañantes." },
        { status: 400 }
      );
    }

    const cleanCompanion = wantsCompanion ? d.companionName?.trim() || "" : "";
    if (wantsCompanion && cleanCompanion.length < 2) {
      return NextResponse.json(
        { error: "Ingresa el nombre de tu acompañante." },
        { status: 400 }
      );
    }

    const created = await prisma.privatePartyRsvp.create({
      data: {
        tenantId: tenant.id,
        guestName: d.guestName.trim(),
        guestPhone: d.guestPhone?.trim() || null,
        hasCompanion: wantsCompanion && allowCompanions,
        companionName: wantsCompanion && allowCompanions ? cleanCompanion : null,
        note: d.note?.trim() || null,
        status: visibility === "PRIVATE" ? "PENDING" : "CONFIRMED",
      },
    });

    const allRsvps = await prisma.privatePartyRsvp.findMany({
      where: { tenantId: tenant.id },
      select: { hasCompanion: true },
    });

    const confirmedCount = allRsvps.length;
    const totalPeopleCount = allRsvps.reduce((acc, r) => acc + (r.hasCompanion ? 2 : 1), 0);

    return NextResponse.json({
      success: true,
      visibility,
      rsvp: created,
      confirmedCount,
      totalPeopleCount,
    });
  } catch (error) {
    console.error("[PARTY_RSVP_POST_ERROR]", error);
    return NextResponse.json({ error: "No se pudo registrar tu confirmación" }, { status: 500 });
  }
}
