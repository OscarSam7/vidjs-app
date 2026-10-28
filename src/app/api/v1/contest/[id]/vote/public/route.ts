import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";
import { broadcastContestEvent } from "@/lib/contest/contest-service";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PublicVoteSchema = z.object({
  performanceId: z.string().min(1, "performanceId requerido"),
  stars: z.number().min(1).max(5).default(5),
  cheerCount: z.number().min(0).max(100).default(1),
  guestSessionToken: z.string().optional().nullable(),
  tableLabel: z.string().optional().nullable(),
});

/**
 * GET /api/v1/contest/[id]/vote/public
 * Permite al DJ y organizadores auditar en tiempo real los votos emitidos por mesa
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const performanceId = searchParams.get("performanceId");

    const contest = await prisma.karaokeContest.findFirst({
      where: { OR: [{ id }, { code: id }] },
    });
    if (!contest) throw new NotFoundError("Concurso no encontrado");

    if (!performanceId) {
      // Auditoría global de votos de mesas en todo el certamen
      const allVotes = await prisma.contestPublicVote.findMany({
        where: { performance: { contestId: contest.id } },
        orderBy: { createdAt: "desc" },
      });

      const tableMap = new Map<
        string,
        { tableLabel: string; totalVotes: number; totalStars: number; cheerCount: number }
      >();

      allVotes.forEach((v) => {
        const label = v.tableLabel || "Público General";
        const t = tableMap.get(label) || { tableLabel: label, totalVotes: 0, totalStars: 0, cheerCount: 0 };
        t.totalVotes += 1;
        t.totalStars += v.stars;
        t.cheerCount += v.cheerCount;
        tableMap.set(label, t);
      });

      const byTable = Array.from(tableMap.values())
        .map((t) => ({
          ...t,
          avgStars: Number((t.totalStars / t.totalVotes).toFixed(1)),
        }))
        .sort((a, b) => b.totalVotes - a.totalVotes);

      return NextResponse.json({
        success: true,
        data: {
          totalVotes: allVotes.length,
          avgStars:
            allVotes.length > 0
              ? Number((allVotes.reduce((a, b) => a + b.stars, 0) / allVotes.length).toFixed(1))
              : 0,
          byTable,
          recentVotes: allVotes.slice(0, 50).map((v) => ({
            id: v.id,
            tableLabel: v.tableLabel,
            stars: v.stars,
            cheerCount: v.cheerCount,
            createdAt: v.createdAt,
          })),
        },
      });
    }

    // Auditoría de la actuación actual
    const performance = await prisma.contestPerformance.findUnique({
      where: { id: performanceId },
      include: {
        publicVotes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!performance) throw new NotFoundError("Actuación no encontrada");

    const votes = performance.publicVotes;
    const totalVotes = votes.length;
    const avgStars =
      totalVotes > 0 ? Number((votes.reduce((a, b) => a + b.stars, 0) / totalVotes).toFixed(1)) : 0;

    const tableMap = new Map<
      string,
      { tableLabel: string; count: number; totalStars: number; cheerCount: number }
    >();

    votes.forEach((v) => {
      const label = v.tableLabel || "Público General";
      const existing = tableMap.get(label) || {
        tableLabel: label,
        count: 0,
        totalStars: 0,
        cheerCount: 0,
      };
      existing.count += 1;
      existing.totalStars += v.stars;
      existing.cheerCount += v.cheerCount;
      tableMap.set(label, existing);
    });

    const votesByTable = Array.from(tableMap.values())
      .map((t) => ({
        tableLabel: t.tableLabel,
        votersCount: t.count,
        avgStars: Number((t.totalStars / t.count).toFixed(1)),
        cheerCount: t.cheerCount,
      }))
      .sort((a, b) => b.votersCount - a.votersCount);

    return NextResponse.json({
      success: true,
      data: {
        performanceId,
        totalVotes,
        avgStars,
        votesByTable,
        votes: votes.map((v) => ({
          id: v.id,
          tableLabel: v.tableLabel,
          stars: v.stars,
          cheerCount: v.cheerCount,
          voterId: v.guestSessionToken ? `${v.guestSessionToken.slice(0, 10)}...` : "anon",
          createdAt: v.createdAt,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/contest/[id]/vote/public
 * Permite a los comensales calificar y aplaudir desde sus mesas.
 * REQUIERE PRESENCIA ESTRICTA EN EL LOCAL (haber escaneado el QR de la mesa).
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = PublicVoteSchema.parse(body);

    const contest = await prisma.karaokeContest.findFirst({
      where: { OR: [{ id }, { code: id }] },
    });
    if (!contest) throw new NotFoundError("Concurso no encontrado");

    const performance = await prisma.contestPerformance.findUnique({
      where: { id: parsed.performanceId },
    });
    if (!performance) throw new NotFoundError("Actuación no encontrada");

    if (performance.status !== "ON_STAGE" && performance.status !== "VOTING_OPEN") {
      throw new BadRequestError("La votación para esta canción no está abierta actualmente");
    }

    // 1. Verificación estricta de presencia en el local mediante sesión de mesa escaneada
    const guestSession = await getCurrentGuestSession();
    if (!guestSession || !guestSession.table) {
      return NextResponse.json(
        {
          error:
            "Para votar debes estar presente físicamente en el local y haber escaneado el código QR de tu mesa.",
          requiresTableScan: true,
        },
        { status: 403 }
      );
    }

    // Verificar que la mesa pertenezca al mismo establecimiento
    if (guestSession.tenant.id !== contest.tenantId) {
      return NextResponse.json(
        {
          error: "Tu mesa no pertenece al establecimiento de este concurso.",
          requiresTableScan: true,
        },
        { status: 403 }
      );
    }

    // Nombre de mesa fidedigno y autoritativo certificado por la base de datos
    const authoritativeTableLabel =
      guestSession.table.label || `Mesa ${guestSession.table.number}`;

    // Token único de dispositivo para que cada celular de la mesa emita su propio voto
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || null;
    const deviceVoterToken = parsed.guestSessionToken || guestSession.sessionToken;

    // 2. Validar si este dispositivo ya votó en esta actuación
    const existing = await prisma.contestPublicVote.findFirst({
      where: {
        performanceId: parsed.performanceId,
        guestSessionToken: deviceVoterToken,
      },
    });

    if (existing) {
      // Actualizar estrellas y sumar aplausos del mismo celular
      const updated = await prisma.contestPublicVote.update({
        where: { id: existing.id },
        data: {
          stars: parsed.stars,
          tableLabel: authoritativeTableLabel,
          cheerCount: { increment: parsed.cheerCount },
        },
      });

      // Recalcular promedio de estrellas
      const allPublicVotes = await prisma.contestPublicVote.findMany({
        where: { performanceId: parsed.performanceId },
        select: { stars: true },
      });
      const avgStars =
        allPublicVotes.reduce((acc, curr) => acc + curr.stars, 0) / allPublicVotes.length;

      broadcastContestEvent(contest.id, contest.eventId, "CONTEST_VOTE_UPDATE", {
        performanceId: parsed.performanceId,
        isPublicVote: true,
        tableLabel: authoritativeTableLabel,
        totalPublicVotes: allPublicVotes.length,
        avgStars: Number(avgStars.toFixed(1)),
        cheerCount: parsed.cheerCount,
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `¡Voto actualizado con éxito desde ${authoritativeTableLabel}!`,
      });
    }

    const vote = await prisma.contestPublicVote.create({
      data: {
        performanceId: parsed.performanceId,
        guestSessionToken: deviceVoterToken,
        tableLabel: authoritativeTableLabel,
        stars: parsed.stars,
        cheerCount: parsed.cheerCount,
        ipAddress: ip,
      },
    });

    // Calcular total de votos públicos
    const allPublicVotes = await prisma.contestPublicVote.findMany({
      where: { performanceId: parsed.performanceId },
      select: { stars: true },
    });
    const avgStars =
      allPublicVotes.reduce((acc, curr) => acc + curr.stars, 0) / allPublicVotes.length;

    broadcastContestEvent(contest.id, contest.eventId, "CONTEST_VOTE_UPDATE", {
      performanceId: parsed.performanceId,
      isPublicVote: true,
      tableLabel: authoritativeTableLabel,
      totalPublicVotes: allPublicVotes.length,
      avgStars: Number(avgStars.toFixed(1)),
      cheerCount: parsed.cheerCount,
    });

    return NextResponse.json({
      success: true,
      data: vote,
      message: `¡Gracias por votar desde ${authoritativeTableLabel}!`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
