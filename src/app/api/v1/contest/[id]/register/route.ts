import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { handleApiError, UnauthorizedError, NotFoundError, BadRequestError } from "@/lib/errors";
import { broadcastContestEvent } from "@/lib/contest/contest-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const GuestApplicationSchema = z.object({
  name: z.string().min(2, "Tu nombre debe tener al menos 2 caracteres"),
  stageName: z.string().optional().nullable(),
  songTitle: z.string().min(2, "El título de la canción es obligatorio"),
  artistName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
});

/**
 * POST /api/v1/contest/[id]/register
 * Permite a los clientes de las mesas postularse como cantantes para el certamen de karaoke
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const guestSession = await getCurrentGuestSession();
    if (!guestSession) {
      throw new UnauthorizedError("Debes escanear el código QR de tu mesa para postularte al concurso");
    }

    const contest = await prisma.karaokeContest.findFirst({
      where: {
        OR: [{ id }, { code: id }],
        tenantId: guestSession.tenantId,
      },
      include: {
        stages: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!contest) {
      throw new NotFoundError("El concurso no existe o no pertenece a este local");
    }

    if (!["ACTIVE", "REGISTRATION"].includes(contest.status)) {
      throw new BadRequestError(
        "El concurso no está recibiendo postulaciones en este momento. Consulta con el DJ o anfitrión."
      );
    }

    const body = await req.json();
    const parsed = GuestApplicationSchema.parse(body);

    // 1. Verificar si ya existe una postulación activa desde esta mesa con este cantante
    const existing = await prisma.contestParticipant.findFirst({
      where: {
        contestId: contest.id,
        tableLabel: guestSession.table.label,
        name: parsed.name.trim(),
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: `¡Ya tienes una postulación registrada para "${existing.name}" en la ${guestSession.table.label}!`,
      });
    }

    // 2. Si el comensal no tenía nombre en su sesión, actualizarlo
    if (!guestSession.guestName && parsed.name.trim()) {
      await prisma.guestSession.update({
        where: { id: guestSession.id },
        data: { guestName: parsed.name.trim() },
      }).catch(() => null);
    }

    // 3. Crear el participante con estado APPLICANT (Postulante en revisión)
    const participant = await prisma.contestParticipant.create({
      data: {
        contestId: contest.id,
        name: parsed.name.trim(),
        stageName: parsed.stageName?.trim() || null,
        phone: parsed.phone?.trim() || null,
        tableLabel: guestSession.table.label,
        bio: parsed.bio?.trim() || null,
        status: "APPLICANT",
      },
    });

    // 4. Crear la actuación pendiente asociada
    const targetStageId = contest.activeStageId || contest.stages[0]?.id;
    let performance = null;
    if (targetStageId) {
      const orderCount = await prisma.contestPerformance.count({
        where: { stageId: targetStageId },
      });

      performance = await prisma.contestPerformance.create({
        data: {
          contestId: contest.id,
          stageId: targetStageId,
          participantId: participant.id,
          songTitle: parsed.songTitle.trim(),
          artistName: parsed.artistName?.trim() || "Artista",
          orderIndex: orderCount,
          status: "PENDING",
        },
      });
    }

    // 5. Notificar en tiempo real al panel del DJ / Jurados
    broadcastContestEvent(contest.id, contest.eventId, "CONTEST_PARTICIPANT_REGISTERED", {
      participant,
      performance,
      tableLabel: guestSession.table.label,
    });

    return NextResponse.json({
      success: true,
      data: {
        participant,
        performance,
      },
      message: `¡Postulación enviada con éxito para la ${guestSession.table.label}! El DJ revisará tu tema para llamarte al escenario.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
