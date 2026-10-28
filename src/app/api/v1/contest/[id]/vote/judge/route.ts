import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";
import { broadcastContestEvent } from "@/lib/contest/contest-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const JudgeVoteSchema = z.object({
  judgePin: z.string().min(4, "PIN de 4 dígitos requerido"),
  performanceId: z.string().min(1, "performanceId requerido"),
  breakdown: z.record(z.string(), z.number()), // { [criteriaId]: score }
  feedbackNotes: z.string().optional().nullable(),
  isGoldenBuzzer: z.boolean().default(false),
});

/**
 * GET /api/v1/contest/[id]/vote/judge?judgePin=...&performanceId=...
 * Consulta si el jurado ya emitió su veredicto para la actuación
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const judgePin = searchParams.get("judgePin");
    const performanceId = searchParams.get("performanceId");

    if (!judgePin || !performanceId) {
      return NextResponse.json(
        { success: false, error: "judgePin y performanceId requeridos" },
        { status: 400 }
      );
    }

    const judge = await prisma.contestJudge.findFirst({
      where: { contestId: id, accessPin: judgePin, active: true },
    });
    if (!judge) throw new NotFoundError("Jurado no encontrado o PIN inválido");

    const existingScore = await prisma.contestJudgeScore.findUnique({
      where: {
        performanceId_judgeId: {
          performanceId,
          judgeId: judge.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        judge,
        hasVoted: Boolean(existingScore),
        score: existingScore,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/contest/[id]/vote/judge
 * Emite la calificación oficial del jurado para una actuación
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = JudgeVoteSchema.parse(body);

    const contest = await prisma.karaokeContest.findUnique({
      where: { id },
      include: { criteria: { where: { active: true } } },
    });
    if (!contest) throw new NotFoundError("Concurso no encontrado");

    // 1. Validar jurado por PIN
    const judge = await prisma.contestJudge.findFirst({
      where: { contestId: id, accessPin: parsed.judgePin, active: true },
    });
    if (!judge) throw new NotFoundError("Jurado no autorizado o PIN incorrecto");

    // 2. Validar que la actuación esté en estado de votación abierta o en escenario
    const performance = await prisma.contestPerformance.findUnique({
      where: { id: parsed.performanceId },
      include: { participant: true },
    });
    if (!performance) throw new NotFoundError("Actuación no encontrada");

    if (performance.status === "VOTING_CLOSED" || performance.status === "REVEALED") {
      throw new BadRequestError("La votación para esta actuación ya fue cerrada");
    }

    // 3. Calcular la puntuación total ponderada según los criterios activos
    let totalScore = 0;
    let totalWeight = 0;

    for (const crit of contest.criteria) {
      const rawValue = parsed.breakdown[crit.id] ?? crit.maxScore / 2;
      const clamped = Math.max(0, Math.min(crit.maxScore, rawValue));
      totalScore += clamped * crit.weight;
      totalWeight += crit.weight;
    }

    // Normalizar si hay pesos
    const normalizedScore = totalWeight > 0 ? Number((totalScore / totalWeight).toFixed(2)) : totalScore;

    // 4. Guardar o actualizar la boleta del jurado
    const scoreRecord = await prisma.contestJudgeScore.upsert({
      where: {
        performanceId_judgeId: {
          performanceId: parsed.performanceId,
          judgeId: judge.id,
        },
      },
      update: {
        breakdown: JSON.stringify(parsed.breakdown),
        totalScore: normalizedScore,
        feedbackNotes: parsed.feedbackNotes || null,
        isGoldenBuzzer: parsed.isGoldenBuzzer,
      },
      create: {
        performanceId: parsed.performanceId,
        judgeId: judge.id,
        breakdown: JSON.stringify(parsed.breakdown),
        totalScore: normalizedScore,
        feedbackNotes: parsed.feedbackNotes || null,
        isGoldenBuzzer: parsed.isGoldenBuzzer,
      },
      include: {
        judge: { select: { id: true, name: true, title: true, avatarUrl: true } },
      },
    });

    // 5. Si activó Golden Buzzer
    if (parsed.isGoldenBuzzer && judge.canGoldenBuzzer) {
      await prisma.contestPerformance.update({
        where: { id: parsed.performanceId },
        data: {
          isGoldenBuzzer: true,
          goldenBuzzerBy: judge.name,
        },
      });

      broadcastContestEvent(id, contest.eventId, "CONTEST_GOLDEN_BUZZER", {
        performanceId: parsed.performanceId,
        judgeName: judge.name,
      });
    }

    // 6. Notificar en tiempo real que este juez ya emitió su voto
    broadcastContestEvent(id, contest.eventId, "CONTEST_VOTE_UPDATE", {
      performanceId: parsed.performanceId,
      judgeId: judge.id,
      judgeName: judge.name,
      hasVoted: true,
      isGoldenBuzzer: parsed.isGoldenBuzzer,
    });

    return NextResponse.json({
      success: true,
      data: scoreRecord,
      message: `¡Veredicto de ${judge.name} enviado con éxito! (${normalizedScore} pts)`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
