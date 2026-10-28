import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";
import { broadcastContestEvent } from "@/lib/contest/contest-service";

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
 * POST /api/v1/contest/[id]/vote/public
 * Permite a los comensales calificar y aplaudir desde sus mesas
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = PublicVoteSchema.parse(body);

    const contest = await prisma.karaokeContest.findUnique({ where: { id } });
    if (!contest) throw new NotFoundError("Concurso no encontrado");

    const performance = await prisma.contestPerformance.findUnique({
      where: { id: parsed.performanceId },
    });
    if (!performance) throw new NotFoundError("Actuación no encontrada");

    if (performance.status !== "ON_STAGE" && performance.status !== "VOTING_OPEN") {
      throw new BadRequestError("La votación para esta canción no está abierta actualmente");
    }

    // IP y token para control anti-spam
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || null;
    const sessionToken = parsed.guestSessionToken || ip || "anon";

    // Validar si ya votó en esta actuación
    if (parsed.guestSessionToken) {
      const existing = await prisma.contestPublicVote.findFirst({
        where: {
          performanceId: parsed.performanceId,
          guestSessionToken: parsed.guestSessionToken,
        },
      });

      if (existing) {
        // Actualizar estrellas y sumar aplausos
        const updated = await prisma.contestPublicVote.update({
          where: { id: existing.id },
          data: {
            stars: parsed.stars,
            cheerCount: { increment: parsed.cheerCount },
          },
        });
        return NextResponse.json({
          success: true,
          data: updated,
          message: "¡Voto actualizado con éxito!",
        });
      }
    }

    const vote = await prisma.contestPublicVote.create({
      data: {
        performanceId: parsed.performanceId,
        guestSessionToken: parsed.guestSessionToken || sessionToken,
        tableLabel: parsed.tableLabel || "Público",
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
    const avgStars = allPublicVotes.reduce((acc, curr) => acc + curr.stars, 0) / allPublicVotes.length;

    broadcastContestEvent(id, contest.eventId, "CONTEST_VOTE_UPDATE", {
      performanceId: parsed.performanceId,
      isPublicVote: true,
      totalPublicVotes: allPublicVotes.length,
      avgStars: Number(avgStars.toFixed(1)),
      cheerCount: parsed.cheerCount,
    });

    return NextResponse.json({
      success: true,
      data: vote,
      message: "¡Gracias por votar desde tu mesa!",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
