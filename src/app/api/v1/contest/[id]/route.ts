import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { broadcastContestEvent } from "@/lib/contest/contest-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/contest/[id]
 * Detalle completo del concurso con todas sus galas, criterios, jurados, participantes y ranking
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const contest = await prisma.karaokeContest.findFirst({
      where: {
        OR: [{ id }, { code: id }],
      },
      include: {
        stages: {
          orderBy: { orderIndex: "asc" },
          include: {
            performances: {
              orderBy: { orderIndex: "asc" },
              include: {
                participant: true,
                judgeScores: {
                  include: {
                    judge: {
                      select: { id: true, name: true, title: true, avatarUrl: true },
                    },
                  },
                },
                publicVotes: true,
              },
            },
          },
        },
        criteria: {
          orderBy: { orderIndex: "asc" },
        },
        judges: {
          orderBy: { createdAt: "asc" },
        },
        participants: {
          orderBy: [
            { totalPoints: "desc" },
            { createdAt: "asc" },
          ],
          include: {
            performances: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!contest) {
      throw new NotFoundError("Concurso no encontrado");
    }

    // Identificar la actuación actualmente en escenario (ON_STAGE o VOTING_OPEN)
    let currentPerformance = null;
    for (const stage of contest.stages) {
      const active = stage.performances.find(
        (p) => p.status === "ON_STAGE" || p.status === "VOTING_OPEN"
      );
      if (active) {
        currentPerformance = active;
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...contest,
        currentPerformance,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/contest/[id]
 * Actualiza configuraciones generales del concurso
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) {
      throw new UnauthorizedError("Debes iniciar sesión para editar el concurso");
    }

    const body = await req.json();

    if (body.status === "ACTIVE" || body.status === "REGISTRATION") {
      // Pausar cualquier otro certamen del tenant para evitar colisiones en los paneles de clientes
      await prisma.karaokeContest.updateMany({
        where: {
          tenantId: session.tenantId,
          id: { not: id },
          status: { in: ["ACTIVE", "REGISTRATION"] },
        },
        data: { status: "PAUSED" },
      });
    }

    const updated = await prisma.karaokeContest.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        description: body.description !== undefined ? body.description : undefined,
        coverUrl: body.coverUrl !== undefined ? body.coverUrl : undefined,
        status: body.status !== undefined ? body.status : undefined,
        scoringMode: body.scoringMode !== undefined ? body.scoringMode : undefined,
        publicVoteWeight: body.publicVoteWeight !== undefined ? body.publicVoteWeight : undefined,
        rules: body.rules !== undefined ? body.rules : undefined,
        prizes: body.prizes !== undefined ? body.prizes : undefined,
        logoUrl: body.logoUrl !== undefined ? body.logoUrl : undefined,
        sponsors: body.sponsors !== undefined ? (typeof body.sponsors === "string" ? body.sponsors : JSON.stringify(body.sponsors)) : undefined,
        organizers: body.organizers !== undefined ? (typeof body.organizers === "string" ? body.organizers : JSON.stringify(body.organizers)) : undefined,
        activeStageId: body.activeStageId !== undefined ? body.activeStageId : undefined,
        requireConsumption: body.requireConsumption !== undefined ? Boolean(body.requireConsumption) : undefined,
        minConsumptionNotes: body.minConsumptionNotes !== undefined ? body.minConsumptionNotes : undefined,
        registrationFee: body.registrationFee !== undefined ? Number(body.registrationFee) : undefined,
        paymentInstructions: body.paymentInstructions !== undefined ? body.paymentInstructions : undefined,
        allowRemoteRegistration: body.allowRemoteRegistration !== undefined ? Boolean(body.allowRemoteRegistration) : undefined,
        scheduledDate: body.scheduledDate !== undefined ? (body.scheduledDate ? new Date(body.scheduledDate) : null) : undefined,
      },
      include: {
        stages: true,
        criteria: true,
        judges: true,
      },
    });

    broadcastContestEvent(updated.id, updated.eventId, "CONTEST_STAGE_CHANGE", {
      contest: updated,
      status: updated.status,
      contestId: updated.id,
      contestName: updated.name,
      contestCode: updated.code,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Ajustes del concurso actualizados correctamente",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/contest/[id]
 * Elimina un concurso y todos sus registros asociados
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) {
      throw new UnauthorizedError("Debes iniciar sesión para eliminar el concurso");
    }

    const contest = await prisma.karaokeContest.findUnique({
      where: { id },
      select: { id: true, eventId: true, name: true, tenantId: true },
    });

    if (!contest) {
      return NextResponse.json({ success: true, message: "Concurso no encontrado o ya eliminado" });
    }

    if (contest.tenantId !== session.tenantId) {
      throw new UnauthorizedError("No tienes permiso para eliminar este concurso");
    }

    await prisma.karaokeContest.delete({
      where: { id },
    });

    broadcastContestEvent(id, contest.eventId, "CONTEST_STAGE_CHANGE", {
      status: "DELETED",
      contestId: id,
      contestName: contest.name,
    });

    return NextResponse.json({
      success: true,
      message: `Concurso "${contest.name}" eliminado correctamente`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
