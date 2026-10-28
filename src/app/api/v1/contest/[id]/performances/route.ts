import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError, NotFoundError } from "@/lib/errors";
import { broadcastContestEvent, calculatePerformanceScore } from "@/lib/contest/contest-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PerformanceSchema = z.object({
  stageId: z.string().min(1, "stageId es obligatorio"),
  participantId: z.string().min(1, "participantId es obligatorio"),
  songTitle: z.string().min(1, "El título de la canción es obligatorio"),
  artistName: z.string().default("Artista"),
  youtubeVideoId: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  orderIndex: z.number().optional(),
});

/**
 * GET /api/v1/contest/[id]/performances
 * Lista las actuaciones agendadas para una fecha/gala
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get("stageId");

    const where: any = { contestId: id };
    if (stageId) where.stageId = stageId;

    const performances = await prisma.contestPerformance.findMany({
      where,
      orderBy: { orderIndex: "asc" },
      include: {
        participant: true,
        stage: true,
        judgeScores: {
          include: {
            judge: { select: { id: true, name: true, title: true, avatarUrl: true } },
          },
        },
        publicVotes: true,
      },
    });

    return NextResponse.json({ success: true, data: performances });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/contest/[id]/performances
 * Agrega un nuevo turno de actuación para un cantante
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) throw new UnauthorizedError("No autorizado");

    const body = await req.json();
    const parsed = PerformanceSchema.parse(body);

    const count = await prisma.contestPerformance.count({
      where: { stageId: parsed.stageId },
    });

    const performance = await prisma.contestPerformance.create({
      data: {
        contestId: id,
        stageId: parsed.stageId,
        participantId: parsed.participantId,
        songTitle: parsed.songTitle,
        artistName: parsed.artistName,
        youtubeVideoId: parsed.youtubeVideoId || null,
        fileUrl: parsed.fileUrl || null,
        orderIndex: parsed.orderIndex !== undefined ? parsed.orderIndex : count,
        status: "PENDING",
      },
      include: {
        participant: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: performance,
      message: `Actuación agendada para ${performance.participant.name}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/contest/[id]/performances
 * Control del Escenario en Vivo (Llamar, Abrir Votación, Cerrar Votación, Revelar, Golden Buzzer)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) throw new UnauthorizedError("No autorizado");

    const body = await req.json();
    const { performanceId, action, notes, orderIndex } = body;

    if (!performanceId) {
      return NextResponse.json({ success: false, error: "performanceId requerido" }, { status: 400 });
    }

    const contest = await prisma.karaokeContest.findUnique({
      where: { id },
      include: { criteria: { where: { active: true } } },
    });
    if (!contest) throw new NotFoundError("Concurso no encontrado");

    let targetEventId = contest.eventId;
    if (!targetEventId) {
      const activeEv = await prisma.event.findFirst({
        where: { tenantId: session.tenantId, status: "ACTIVE" },
        select: { id: true },
      });
      if (activeEv) {
        targetEventId = activeEv.id;
        await prisma.karaokeContest
          .update({
            where: { id },
            data: { eventId: targetEventId },
          })
          .catch(() => {});
      }
    }

    const perf = await prisma.contestPerformance.findUnique({
      where: { id: performanceId },
      include: {
        participant: true,
        judgeScores: {
          include: { judge: { select: { id: true, name: true, title: true, avatarUrl: true } } },
        },
        publicVotes: true,
      },
    });
    if (!perf) throw new NotFoundError("Actuación no encontrada");

    let updatedPerf;

    if (action === "CALL_TO_STAGE") {
      // 1. Poner cualquier otra actuación de este concurso en estado previo
      await prisma.contestPerformance.updateMany({
        where: { contestId: id, status: "ON_STAGE" },
        data: { status: "PENDING" },
      });

      // 2. Colocar al cantante actual EN ESCENARIO
      updatedPerf = await prisma.contestPerformance.update({
        where: { id: performanceId },
        data: {
          status: "ON_STAGE",
          startedAt: new Date(),
        },
        include: { participant: true },
      });

      // Broadcast a la pantalla de TV y evento
      broadcastContestEvent(id, targetEventId, "CONTEST_PERFORMANCE_UPDATE", {
        action: "CALL_TO_STAGE",
        performance: updatedPerf,
        criteria: contest.criteria,
      });

      // También emitir llamada de escenario tradicional
      broadcastContestEvent(id, targetEventId, "SINGER_CALLED", {
        tableLabel: updatedPerf.participant.tableLabel,
        singerName: updatedPerf.participant.stageName || updatedPerf.participant.name,
        songTitle: updatedPerf.songTitle,
        artist: updatedPerf.artistName,
      });

      return NextResponse.json({
        success: true,
        data: updatedPerf,
        message: `📢 ¡Llamando a ${updatedPerf.participant.name} al escenario!`,
      });
    }

    if (action === "OPEN_VOTING") {
      // Habilitar votación en los teléfonos de los jurados
      updatedPerf = await prisma.contestPerformance.update({
        where: { id: performanceId },
        data: { status: "VOTING_OPEN" },
        include: {
          participant: true,
          judgeScores: {
            include: { judge: { select: { id: true, name: true, title: true } } },
          },
        },
      });

      broadcastContestEvent(id, targetEventId, "CONTEST_VOTING_OPEN", {
        performance: updatedPerf,
        criteria: contest.criteria,
      });

      return NextResponse.json({
        success: true,
        data: updatedPerf,
        message: "🗳️ ¡Votación del jurado y público ABIERTA!",
      });
    }

    if (action === "CLOSE_VOTING") {
      // Calcular puntajes finales
      const scores = calculatePerformanceScore({
        judgeScores: perf.judgeScores,
        publicVotes: perf.publicVotes,
        scoringMode: contest.scoringMode,
        publicVoteWeight: contest.publicVoteWeight,
      });

      updatedPerf = await prisma.contestPerformance.update({
        where: { id: performanceId },
        data: {
          status: "VOTING_CLOSED",
          judgeScore: scores.judgeScore,
          publicScore: scores.publicScore,
          totalScore: scores.totalScore,
          isGoldenBuzzer: scores.hasGoldenBuzzer,
          endedAt: new Date(),
        },
        include: {
          participant: true,
          judgeScores: {
            include: { judge: { select: { id: true, name: true, title: true, avatarUrl: true } } },
          },
          publicVotes: true,
        },
      });

      // Actualizar puntos acumulados del participante
      const allParticipantPerfs = await prisma.contestPerformance.findMany({
        where: { participantId: perf.participantId, status: { in: ["VOTING_CLOSED", "REVEALED"] } },
        select: { totalScore: true },
      });
      const newTotalPoints = allParticipantPerfs.reduce((acc, curr) => acc + curr.totalScore, 0);

      await prisma.contestParticipant.update({
        where: { id: perf.participantId },
        data: { totalPoints: newTotalPoints },
      });

      broadcastContestEvent(id, targetEventId, "CONTEST_VOTING_CLOSED", {
        performance: updatedPerf,
      });

      return NextResponse.json({
        success: true,
        data: updatedPerf,
        message: `Votación cerrada. Puntuación final: ${scores.totalScore} pts`,
      });
    }

    if (action === "REVEAL_SCORES") {
      // Disparar la revelación en la pantalla gigante de TV
      updatedPerf = await prisma.contestPerformance.update({
        where: { id: performanceId },
        data: { status: "REVEALED" },
        include: {
          participant: true,
          judgeScores: {
            include: { judge: { select: { id: true, name: true, title: true, avatarUrl: true } } },
          },
          publicVotes: true,
        },
      });

      broadcastContestEvent(id, targetEventId, "CONTEST_REVEAL_SCORES", {
        performance: updatedPerf,
        criteria: contest.criteria,
      });

      return NextResponse.json({
        success: true,
        data: updatedPerf,
        message: "✨ ¡Puntajes revelados en la pantalla grande!",
      });
    }

    if (action === "TRIGGER_GOLDEN_BUZZER") {
      const { judgeName } = body;
      updatedPerf = await prisma.contestPerformance.update({
        where: { id: performanceId },
        data: {
          isGoldenBuzzer: true,
          goldenBuzzerBy: judgeName || "Pase de Oro del Jurado",
        },
        include: { participant: true },
      });

      broadcastContestEvent(id, targetEventId, "CONTEST_GOLDEN_BUZZER", {
        performance: updatedPerf,
        judgeName: judgeName || "Pase de Oro",
      });

      return NextResponse.json({
        success: true,
        data: updatedPerf,
        message: "🌟 ¡GOLDEN BUZZER DISPARADO EN PANTALLA GIGANTE!",
      });
    }

    // Actualizaciones directas menores
    updatedPerf = await prisma.contestPerformance.update({
      where: { id: performanceId },
      data: {
        notes: notes !== undefined ? notes : undefined,
        orderIndex: orderIndex !== undefined ? orderIndex : undefined,
      },
      include: { participant: true },
    });

    return NextResponse.json({ success: true, data: updatedPerf });
  } catch (error) {
    return handleApiError(error);
  }
}
