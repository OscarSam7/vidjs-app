import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/contest/[id]/reports
 * Genera el informe completo, acta de certamen y clasificación multidía para imprimir o exportar
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get("stageId");

    const contest = await prisma.karaokeContest.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        tenant: {
          select: { name: true, slug: true, logoUrl: true },
        },
        stages: {
          orderBy: { orderIndex: "asc" },
        },
        criteria: {
          where: { active: true },
          orderBy: { orderIndex: "asc" },
        },
        judges: {
          orderBy: { createdAt: "asc" },
        },
        participants: {
          orderBy: [{ totalPoints: "desc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!contest) throw new NotFoundError("Concurso no encontrado");

    // Filtrar actuaciones según la gala seleccionada o todas
    const performanceWhere: any = { contestId: contest.id };
    if (stageId) performanceWhere.stageId = stageId;

    const performances = await prisma.contestPerformance.findMany({
      where: performanceWhere,
      orderBy: [{ totalScore: "desc" }, { orderIndex: "asc" }],
      include: {
        participant: true,
        stage: true,
        judgeScores: {
          include: {
            judge: { select: { id: true, name: true, title: true } },
          },
        },
        publicVotes: true,
      },
    });

    // 1. Construir la Tabla de Clasificación Oficial
    // Si es por gala, el ranking es por el puntaje de la gala. Si es global, por totalPoints.
    const leaderboard = performances.map((perf, index) => {
      // Parsear desglose de criterios de cada juez
      const scoresByJudge = perf.judgeScores.map((js) => {
        let breakdownParsed: Record<string, number> = {};
        try {
          breakdownParsed = JSON.parse(js.breakdown);
        } catch {}

        return {
          judgeId: js.judgeId,
          judgeName: js.judge.name,
          judgeTitle: js.judge.title,
          totalScore: js.totalScore,
          feedbackNotes: js.feedbackNotes,
          isGoldenBuzzer: js.isGoldenBuzzer,
          criteriaScores: breakdownParsed,
        };
      });

      return {
        rank: index + 1,
        performanceId: perf.id,
        participantId: perf.participant.id,
        name: perf.participant.name,
        stageName: perf.participant.stageName || perf.participant.name,
        tableLabel: perf.participant.tableLabel || "Mesa VIP",
        songTitle: perf.songTitle,
        artistName: perf.artistName,
        stageTitle: perf.stage.title,
        judgeScore: perf.judgeScore,
        publicScore: perf.publicScore,
        totalScore: perf.totalScore,
        isGoldenBuzzer: perf.isGoldenBuzzer,
        goldenBuzzerBy: perf.goldenBuzzerBy,
        scoresByJudge,
        publicVotesCount: perf.publicVotes.length,
        publicVotes: perf.publicVotes.map((pv) => ({
          id: pv.id,
          tableLabel: pv.tableLabel,
          stars: pv.stars,
          cheerCount: pv.cheerCount,
        })),
      };
    });

    // 2. Estadísticas del Certamen
    let highestPerformance: { participantName: string; songTitle: string; score: number } | null = null;
    let totalVotesCast = 0;
    let totalPublicStars = 0;

    // Desglose de votos populares por mesa
    const tableVotesMap = new Map<
      string,
      { tableLabel: string; totalVotes: number; totalStars: number; cheerCount: number }
    >();

    performances.forEach((p) => {
      totalVotesCast += p.judgeScores.length + p.publicVotes.length;
      totalPublicStars += p.publicVotes.reduce((acc, v) => acc + v.stars, 0);
      if (!highestPerformance || p.totalScore > highestPerformance.score) {
        highestPerformance = {
          participantName: p.participant.name,
          songTitle: p.songTitle,
          score: p.totalScore,
        };
      }

      p.publicVotes.forEach((pv) => {
        const label = pv.tableLabel || "Público General";
        const cur = tableVotesMap.get(label) || {
          tableLabel: label,
          totalVotes: 0,
          totalStars: 0,
          cheerCount: 0,
        };
        cur.totalVotes += 1;
        cur.totalStars += pv.stars;
        cur.cheerCount += pv.cheerCount;
        tableVotesMap.set(label, cur);
      });
    });

    const tableStats = Array.from(tableVotesMap.values())
      .map((t) => ({
        tableLabel: t.tableLabel,
        totalVotes: t.totalVotes,
        avgStars: Number((t.totalStars / t.totalVotes).toFixed(1)),
        cheerCount: t.cheerCount,
      }))
      .sort((a, b) => b.totalVotes - a.totalVotes);

    // Desglose de jueces y promedios otorgados
    const judgeStats = contest.judges.map((j) => {
      const allScoresGiven = performances.flatMap((p) =>
        p.judgeScores.filter((js) => js.judgeId === j.id).map((js) => js.totalScore)
      );
      const avg =
        allScoresGiven.length > 0
          ? Number((allScoresGiven.reduce((a, b) => a + b, 0) / allScoresGiven.length).toFixed(2))
          : 0;
      return {
        id: j.id,
        name: j.name,
        title: j.title,
        evaluationsCount: allScoresGiven.length,
        averageGiven: avg,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        contest: {
          id: contest.id,
          name: contest.name,
          code: contest.code,
          description: contest.description,
          status: contest.status,
          scoringMode: contest.scoringMode,
          publicVoteWeight: contest.publicVoteWeight,
          rules: contest.rules,
          prizes: contest.prizes,
          tenantName: contest.tenant.name,
          logoUrl: contest.tenant.logoUrl,
          createdAt: contest.createdAt,
        },
        activeStage: contest.stages.find((s) => s.id === (stageId || contest.activeStageId)) || null,
        stages: contest.stages,
        criteria: contest.criteria,
        judges: contest.judges,
        leaderboard,
        stats: {
          totalParticipants: contest.participants.length,
          totalPerformances: performances.length,
          totalVotesCast,
          totalPublicStars,
          highestPerformance,
          judgeStats,
          tableStats,
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
