import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, NotFoundError, UnauthorizedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const JudgeAuthSchema = z.object({
  contestCode: z.string().min(1, "Código de concurso requerido"),
  accessPin: z.string().min(4, "PIN de acceso requerido"),
});

/**
 * POST /api/v1/contest/judge/auth
 * Valida el PIN del jurado y retorna el estado completo del concurso para calificar
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = JudgeAuthSchema.parse(body);

    const contest = await prisma.karaokeContest.findFirst({
      where: {
        OR: [
          { code: parsed.contestCode.toUpperCase().trim() },
          { id: parsed.contestCode.trim() },
        ],
      },
      include: {
        criteria: {
          where: { active: true },
          orderBy: { orderIndex: "asc" },
        },
        judges: {
          where: { active: true },
        },
        stages: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!contest) {
      throw new NotFoundError("Concurso no encontrado con ese código");
    }

    // Buscar juez correspondiente
    const judge = contest.judges.find(
      (j) => j.accessPin.trim() === parsed.accessPin.trim()
    );

    if (!judge) {
      throw new UnauthorizedError("PIN de jurado incorrecto para este certamen");
    }

    // Buscar la actuación activa en este momento
    const currentPerformance = await prisma.contestPerformance.findFirst({
      where: {
        contestId: contest.id,
        status: { in: ["ON_STAGE", "VOTING_OPEN"] },
      },
      include: {
        participant: true,
        stage: true,
        judgeScores: {
          where: { judgeId: judge.id },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        judge: {
          id: judge.id,
          name: judge.name,
          title: judge.title,
          avatarUrl: judge.avatarUrl,
          canGoldenBuzzer: judge.canGoldenBuzzer,
        },
        contest: {
          id: contest.id,
          name: contest.name,
          code: contest.code,
          scoringMode: contest.scoringMode,
          rules: contest.rules,
        },
        criteria: contest.criteria,
        currentPerformance: currentPerformance
          ? {
              id: currentPerformance.id,
              songTitle: currentPerformance.songTitle,
              artistName: currentPerformance.artistName,
              status: currentPerformance.status,
              participant: currentPerformance.participant,
              myScore: currentPerformance.judgeScores[0] || null,
            }
          : null,
      },
      message: `¡Bienvenido/a ${judge.name}!`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
