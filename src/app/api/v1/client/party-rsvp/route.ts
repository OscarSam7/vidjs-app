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

function parseAllowCompanions(rawSettings?: string | null): boolean {
  if (!rawSettings) return true;
  try {
    const parsed = JSON.parse(rawSettings);
    if (parsed?.partyInvite && typeof parsed.partyInvite.allowCompanions === "boolean") {
      return parsed.partyInvite.allowCompanions;
    }
    return true;
  } catch {
    return true;
  }
}

export async function GET(req: NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get("slug")?.trim();
    if (!slug) {
      return NextResponse.json({ error: "Parámetro slug requerido" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
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
      return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
    }

    const allowCompanions = parseAllowCompanions(tenant.settings);
    const confirmedCount = tenant.privatePartyRsvps.length;
    const totalPeopleCount = tenant.privatePartyRsvps.reduce(
      (acc, r) => acc + (r.hasCompanion ? 2 : 1),
      0
    );

    return NextResponse.json({
      success: true,
      allowCompanions,
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
    const tenant = await prisma.tenant.findUnique({
      where: { slug: d.tenantSlug },
      select: { id: true, name: true, slug: true, settings: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Fiesta o evento no encontrado" }, { status: 404 });
    }

    const allowCompanions = parseAllowCompanions(tenant.settings);
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
      rsvp: created,
      confirmedCount,
      totalPeopleCount,
    });
  } catch (error) {
    console.error("[PARTY_RSVP_POST_ERROR]", error);
    return NextResponse.json({ error: "No se pudo registrar tu confirmación" }, { status: 500 });
  }
}
