import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const now = new Date();

    const [events, contests, flashDeals, tenants] = await Promise.all([
      // Eventos activos o próximos con contador de sesiones en vivo (Pulse Live)
      prisma.event.findMany({
        where: {
          status: { in: ["ACTIVE", "DRAFT"] },
        },
        include: {
          tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
          venue: { select: { id: true, name: true, address: true, whatsappNumber: true } },
          _count: {
            select: {
              guestSessions: true,
              songRequests: true,
            },
          },
        },
        orderBy: [{ status: "asc" }, { startsAt: "asc" }],
        take: 24,
      }),

      // Concursos de Karaoke activos o con inscripciones abiertas
      prisma.karaokeContest.findMany({
        where: {
          status: { in: ["ACTIVE", "REGISTRATION"] },
        },
        include: {
          tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      }),

      // Flash Deals vigentes de último minuto
      prisma.clubFlashDeal.findMany({
        where: {
          active: true,
          expiresAt: { gt: now },
        },
        include: {
          tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
        orderBy: { expiresAt: "asc" },
        take: 12,
      }),

      // Locales adheridos activos
      prisma.tenant.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          venues: {
            where: { active: true },
            select: { id: true, name: true, address: true, whatsappNumber: true, googleReviewUrl: true },
            take: 1,
          },
          venueReviews: {
            select: { rating: true },
          },
          _count: {
            select: {
              events: { where: { status: "ACTIVE" } },
              clubRewards: { where: { active: true } },
              reservationPackages: { where: { active: true } },
              tables: { where: { active: true } },
              karaokeContests: { where: { status: { in: ["ACTIVE", "REGISTRATION"] } } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 24,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events: events.map((ev) => ({
          id: ev.id,
          name: ev.name,
          description: ev.description,
          code: ev.code,
          status: ev.status,
          startsAt: ev.startsAt,
          bannerUrl: ev.bannerUrl,
          logoUrl: ev.logoUrl,
          eventType: ev.eventType || "FIESTA",
          locationName: ev.locationName || ev.venue?.name || ev.tenant?.name,
          address: ev.address || ev.venue?.address,
          isPublicRegistration: ev.isPublicRegistration,
          tenant: ev.tenant,
          pulseCount: (ev._count?.guestSessions || 0) + (ev._count?.songRequests || 0),
        })),
        contests: contests.map((c) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          code: c.code,
          status: c.status,
          coverUrl: c.coverUrl,
          registrationFee: c.registrationFee,
          scheduledDate: c.scheduledDate,
          tenant: c.tenant,
        })),
        flashDeals: flashDeals.map((d) => ({
          id: d.id,
          title: d.title,
          subtitle: d.subtitle,
          discountLabel: d.discountLabel,
          minTier: d.minTier,
          expiresAt: d.expiresAt,
          tenant: d.tenant,
        })),
        venues: tenants.map((t) => {
          const revCount = t.venueReviews?.length || 0;
          const avgRating =
            revCount > 0
              ? Number(
                  (
                    t.venueReviews.reduce((acc, r) => acc + r.rating, 0) / revCount
                  ).toFixed(1)
                )
              : 0;
          const lowerName = t.name.toLowerCase();
          const categories: string[] = ["LOCALES"];
          if (lowerName.includes("karaoke") || (t._count?.karaokeContests || 0) > 0) {
            categories.push("KARAOKE");
          }
          if (lowerName.includes("bar") || lowerName.includes("lounge") || lowerName.includes("pub")) {
            categories.push("BARES");
          }
          if (lowerName.includes("rumba") || lowerName.includes("club") || lowerName.includes("stage") || lowerName.includes("disco")) {
            categories.push("DISCOTECAS");
          }
          if (lowerName.includes("cumple") || lowerName.includes("fiesta") || lowerName.includes("quincho")) {
            categories.push("FIESTAS");
          }
          if ((t._count?.reservationPackages || 0) > 0 || (t._count?.tables || 0) > 0) {
            categories.push("RESERVAS");
          }

          return {
            id: t.id,
            name: t.name,
            slug: t.slug,
            logoUrl: t.logoUrl,
            address: t.venues[0]?.address || null,
            whatsappNumber: t.venues[0]?.whatsappNumber || null,
            googleReviewUrl: t.venues[0]?.googleReviewUrl || null,
            avgRating,
            reviewsCount: revCount,
            hasLiveEvent: (t._count?.events || 0) > 0,
            rewardsCount: t._count?.clubRewards || 0,
            reservationPackagesCount: t._count?.reservationPackages || 0,
            tablesCount: t._count?.tables || 0,
            categories,
          };
        }),
      },
    });
  } catch (error) {
    console.error("[CLIENT_EXPLORE_GET_ERROR]", error);
    return NextResponse.json({ error: "Error cargando cartelera de eventos" }, { status: 500 });
  }
}
