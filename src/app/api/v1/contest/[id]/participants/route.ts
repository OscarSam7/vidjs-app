import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError, NotFoundError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ParticipantSchema = z.object({
  name: z.string().min(2, "El nombre del participante es obligatorio"),
  stageName: z.string().optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  tableLabel: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  initialSongTitle: z.string().optional().nullable(),
  initialArtistName: z.string().optional().nullable(),
  stageId: z.string().optional().nullable(),
});

/**
 * GET /api/v1/contest/[id]/participants
 * Lista todos los participantes del certamen ordenados por ranking
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const participants = await prisma.contestParticipant.findMany({
      where: { contestId: id },
      orderBy: [
        { totalPoints: "desc" },
        { createdAt: "asc" },
      ],
      include: {
        performances: {
          orderBy: { createdAt: "desc" },
          include: {
            stage: true,
            judgeScores: {
              include: { judge: { select: { name: true, title: true } } },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: participants });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/contest/[id]/participants
 * Inscribe a un nuevo cantante en el concurso y opcionalmente agenda su actuación en la fecha activa
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) throw new UnauthorizedError("No autorizado");

    const body = await req.json();
    const parsed = ParticipantSchema.parse(body);

    const contest = await prisma.karaokeContest.findUnique({ where: { id } });
    if (!contest) throw new NotFoundError("Concurso no encontrado");

    // 1. Crear participante
    const participant = await prisma.contestParticipant.create({
      data: {
        contestId: id,
        name: parsed.name,
        stageName: parsed.stageName || null,
        photoUrl: parsed.photoUrl || null,
        phone: parsed.phone || null,
        email: parsed.email || null,
        tableLabel: parsed.tableLabel || null,
        bio: parsed.bio || null,
        status: "ACTIVE",
      },
    });

    // 2. Si se especificó canción y fecha, crear la actuación automáticamente
    const targetStageId = parsed.stageId || contest.activeStageId;
    if (targetStageId && parsed.initialSongTitle) {
      const orderCount = await prisma.contestPerformance.count({
        where: { stageId: targetStageId },
      });

      await prisma.contestPerformance.create({
        data: {
          contestId: id,
          stageId: targetStageId,
          participantId: participant.id,
          songTitle: parsed.initialSongTitle,
          artistName: parsed.initialArtistName || "Artista",
          orderIndex: orderCount,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: participant,
      message: `¡Participante "${participant.name}" inscrito con éxito!`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/contest/[id]/participants
 * Actualiza el estado del participante (CALIFICADO, ELIMINADO, GANADOR, etc.)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) throw new UnauthorizedError("No autorizado");

    const body = await req.json();
    const { participantId, status, finalRank, tableLabel, name, stageName, photoUrl, totalPoints } = body;

    if (!participantId) {
      return NextResponse.json({ success: false, error: "participantId requerido" }, { status: 400 });
    }

    const updated = await prisma.contestParticipant.update({
      where: { id: participantId },
      data: {
        status: status || undefined,
        finalRank: finalRank !== undefined ? finalRank : undefined,
        tableLabel: tableLabel !== undefined ? tableLabel : undefined,
        name: name || undefined,
        stageName: stageName !== undefined ? stageName : undefined,
        photoUrl: photoUrl !== undefined ? photoUrl : undefined,
        totalPoints: totalPoints !== undefined ? totalPoints : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Participante actualizado con éxito",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/contest/[id]/participants?participantId=...
 * Elimina un participante
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(req.url);
    const participantId = searchParams.get("participantId");
    if (!participantId) {
      return NextResponse.json({ success: false, error: "participantId requerido" }, { status: 400 });
    }

    await prisma.contestParticipant.delete({ where: { id: participantId } });
    return NextResponse.json({ success: true, message: "Participante eliminado" });
  } catch (error) {
    return handleApiError(error);
  }
}
