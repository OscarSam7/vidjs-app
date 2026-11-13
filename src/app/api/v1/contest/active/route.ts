import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { handleApiError } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/contest/active
 * Retorna el certamen de karaoke activo o en fase de inscripción para clientes
 * Funciona tanto para comensales en mesa (vía QR) como para público remoto/online
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const codeParam = searchParams.get("code")?.trim().toUpperCase();
    const venueParam = searchParams.get("venue")?.trim();
    const contestIdParam = searchParams.get("contestId")?.trim();
    const guestSession = await getCurrentGuestSession().catch(() => null);

    let targetTenantId: string | null = guestSession?.tenantId || null;
    let targetEventId: string | null = guestSession?.eventId || null;

    // Si no hay sesión de mesa, resolver por código de evento, venue o código de concurso
    let directContestByCode = null;
    if (codeParam) {
      // 1. Intentar buscar concurso directo por código (ej: CONCURSO-ABCD)
      directContestByCode = await prisma.karaokeContest.findFirst({
        where: {
          code: codeParam,
        },
      });

      if (!directContestByCode) {
        // 2. Intentar buscar evento por código (ej: RETRO-POP)
        const eventMatch = await prisma.event.findFirst({
          where: {
            OR: [{ code: codeParam }, { id: codeParam }],
          },
          select: { id: true, tenantId: true },
        });
        if (eventMatch) {
          targetTenantId = eventMatch.tenantId;
          targetEventId = eventMatch.id;
        }
      }
    }

    if (!targetTenantId && venueParam) {
      const venue = await prisma.venue.findFirst({
        where: {
          OR: [{ slug: venueParam }, { id: venueParam }],
        },
        select: { tenantId: true },
      });
      if (venue) {
        targetTenantId = venue.tenantId;
      }
    }

    // Buscar concurso objetivo
    let activeContest = null;

    if (contestIdParam) {
      activeContest = await prisma.karaokeContest.findFirst({
        where: {
          OR: [{ id: contestIdParam }, { code: contestIdParam.toUpperCase() }],
        },
        include: {
          stages: { orderBy: { orderIndex: "asc" } },
          criteria: { where: { active: true }, orderBy: { orderIndex: "asc" } },
          _count: { select: { participants: true } },
        },
      });
    } else if (directContestByCode) {
      activeContest = await prisma.karaokeContest.findUnique({
        where: { id: directContestByCode.id },
        include: {
          stages: { orderBy: { orderIndex: "asc" } },
          criteria: { where: { active: true }, orderBy: { orderIndex: "asc" } },
          _count: { select: { participants: true } },
        },
      });
    } else {
      const whereConditions: any[] = [];

      if (targetTenantId) {
        whereConditions.push({
          tenantId: targetTenantId,
          status: { in: ["ACTIVE", "REGISTRATION"] },
          ...(targetEventId
            ? {
                OR: [{ eventId: targetEventId }, { eventId: null }],
              }
            : {}),
        });
        // Si no se encuentra con el filtro estricto de eventId, buscar cualquier certamen del tenant
        whereConditions.push({
          tenantId: targetTenantId,
          status: { in: ["ACTIVE", "REGISTRATION"] },
        });
      }

      // Fallback global a cualquier concurso activo
      whereConditions.push({
        status: { in: ["ACTIVE", "REGISTRATION"] },
      });

      for (const where of whereConditions) {
        activeContest = await prisma.karaokeContest.findFirst({
          where,
          orderBy: { updatedAt: "desc" },
          include: {
            stages: { orderBy: { orderIndex: "asc" } },
            criteria: { where: { active: true }, orderBy: { orderIndex: "asc" } },
            _count: { select: { participants: true } },
          },
        });
        if (activeContest) break;
      }
    }

    if (!activeContest) {
      return NextResponse.json({
        success: true,
        data: null,
      });
    }

    // Consultar actuación activa en el escenario
    const activePerformance = await prisma.contestPerformance.findFirst({
      where: {
        contestId: activeContest.id,
        status: { in: ["ON_STAGE", "VOTING_OPEN"] },
      },
      include: {
        participant: {
          select: { id: true, name: true, stageName: true, tableLabel: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Consultar postulación previa del usuario si está en mesa
    let myApplication = null;
    if (guestSession) {
      const app = await prisma.contestParticipant.findFirst({
        where: {
          contestId: activeContest.id,
          OR: [
            { tableLabel: guestSession.table.label },
            ...(guestSession.guestName ? [{ name: guestSession.guestName }] : []),
          ],
        },
        include: {
          performances: { take: 1, orderBy: { createdAt: "desc" } },
        },
        orderBy: { createdAt: "desc" },
      });

      if (app) {
        myApplication = {
          id: app.id,
          name: app.name,
          stageName: app.stageName,
          status: app.status,
          songTitle: app.performances[0]?.songTitle || null,
          artistName: app.performances[0]?.artistName || null,
          tableLabel: app.tableLabel,
          paymentStatus: app.paymentStatus,
          paymentMethod: app.paymentMethod,
        };
      }
    }

    const payload = {
      id: activeContest.id,
      name: activeContest.name,
      code: activeContest.code,
      status: activeContest.status,
      allowRegistrations: activeContest.status === "REGISTRATION" || activeContest.status === "ACTIVE",
      description: activeContest.description,
      prizes: activeContest.prizes,
      rules: activeContest.rules,
      logoUrl: activeContest.logoUrl,
      coverUrl: activeContest.coverUrl,
      registrationFee: activeContest.registrationFee || 0,
      paymentInstructions: activeContest.paymentInstructions || null,
      allowRemoteRegistration: activeContest.allowRemoteRegistration,
      scheduledDate: activeContest.scheduledDate ? activeContest.scheduledDate.toISOString() : null,
      stageTitle: activeContest.stages.find((s) => s.id === activeContest.activeStageId)?.title || activeContest.stages[0]?.title || "Gala de Karaoke",
      stages: activeContest.stages.map((st) => ({
        id: st.id,
        title: st.title,
        stageType: st.stageType,
        date: st.date.toISOString(),
        status: st.status,
      })),
      scoringMode: activeContest.scoringMode,
      publicVoteWeight: activeContest.publicVoteWeight,
      requireConsumption: activeContest.requireConsumption,
      minConsumptionNotes: activeContest.minConsumptionNotes,
      participantsCount: activeContest._count?.participants || 0,
      myApplication,
      activePerformance: activePerformance
        ? {
            id: activePerformance.id,
            songTitle: activePerformance.songTitle,
            artistName: activePerformance.artistName,
            participantName: activePerformance.participant.name,
            stageName: activePerformance.participant.stageName,
            tableLabel: activePerformance.participant.tableLabel,
            status: activePerformance.status,
          }
        : null,
    };

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
