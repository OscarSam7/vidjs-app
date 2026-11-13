import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { handleApiError, NotFoundError, BadRequestError } from "@/lib/errors";
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
  email: z.string().email("Correo electrónico inválido").optional().nullable().or(z.literal("")),
  bio: z.string().optional().nullable(),
  isRemote: z.boolean().optional().default(false),
  tableLabel: z.string().optional().nullable(),
  selectedStageId: z.string().optional().nullable(),
  paymentMethod: z.enum(["TRANSFER", "CASH_LOCAL", "CARD_LOCAL", "FREE"]).default("FREE"),
  paymentReference: z.string().optional().nullable(),
  paymentProofUrl: z.string().optional().nullable(),
  paymentAmount: z.number().optional().default(0),
});

/**
 * POST /api/v1/contest/[id]/register
 * Permite a los clientes postularse como cantantes para el certamen de karaoke
 * (tanto desde mesa presencial como inscripción remota / online previa para determinada fecha)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const guestSession = await getCurrentGuestSession();
    const body = await req.json();
    const parsed = GuestApplicationSchema.parse(body);

    // 1. Buscar el concurso por ID o Código corto
    const whereClause: any = {
      OR: [{ id }, { code: id }],
    };
    if (guestSession?.tenantId) {
      whereClause.tenantId = guestSession.tenantId;
    }

    const contest = await prisma.karaokeContest.findFirst({
      where: whereClause,
      include: {
        stages: { orderBy: { orderIndex: "asc" } },
      },
    });

    if (!contest) {
      throw new NotFoundError("El concurso no existe o no se encuentra disponible");
    }

    if (!["ACTIVE", "REGISTRATION"].includes(contest.status)) {
      throw new BadRequestError(
        "El certamen no está recibiendo postulaciones en este momento. Consulta con el DJ o anfitrión."
      );
    }

    const isRemote = !guestSession || Boolean(parsed.isRemote);
    const resolvedTableLabel = guestSession?.table?.label
      ? guestSession.table.label
      : parsed.tableLabel?.trim() || (isRemote ? "Inscripción Online" : "Mesa");

    // 2. Si es remoto y el concurso no permite inscripción remota
    if (isRemote && !contest.allowRemoteRegistration && !guestSession) {
      throw new BadRequestError("Este certamen requiere estar presente en el local y escanear el código QR de una mesa para postular.");
    }

    // 3. Verificar si ya existe una postulación activa
    const existing = await prisma.contestParticipant.findFirst({
      where: {
        contestId: contest.id,
        OR: [
          ...(guestSession ? [{ tableLabel: guestSession.table.label, name: parsed.name.trim() }] : []),
          ...(parsed.phone?.trim() ? [{ phone: parsed.phone.trim() }] : []),
          { name: parsed.name.trim(), contestId: contest.id },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        data: existing,
        message: `¡Ya tienes una postulación registrada para "${existing.name}" (${existing.tableLabel || "Online"})!`,
      });
    }

    // 4. Si el comensal de mesa no tenía nombre en su sesión, actualizarlo
    if (guestSession && !guestSession.guestName && parsed.name.trim()) {
      await prisma.guestSession.update({
        where: { id: guestSession.id },
        data: { guestName: parsed.name.trim() },
      }).catch(() => null);
    }

    // 5. Determinar estado de pago
    const fee = contest.registrationFee || 0;
    let paymentStatus = "PENDING";
    if (fee <= 0 || parsed.paymentMethod === "FREE") {
      paymentStatus = "PAID";
    } else if (parsed.paymentMethod === "TRANSFER" && (parsed.paymentReference || parsed.paymentProofUrl)) {
      paymentStatus = "PENDING"; // En revisión de comprobante
    } else if (parsed.paymentMethod === "CASH_LOCAL" || parsed.paymentMethod === "CARD_LOCAL") {
      paymentStatus = "PENDING"; // Paga al llegar a caja/barra
    }

    // 6. Crear el participante con estado APPLICANT (Postulante en revisión)
    const participant = await prisma.contestParticipant.create({
      data: {
        contestId: contest.id,
        name: parsed.name.trim(),
        stageName: parsed.stageName?.trim() || null,
        phone: parsed.phone?.trim() || null,
        email: parsed.email?.trim() || null,
        tableLabel: resolvedTableLabel,
        isRemote,
        selectedStageId: parsed.selectedStageId || contest.activeStageId || contest.stages[0]?.id || null,
        paymentMethod: parsed.paymentMethod,
        paymentStatus,
        paymentProofUrl: parsed.paymentProofUrl?.trim() || null,
        paymentReference: parsed.paymentReference?.trim() || null,
        paymentAmount: fee,
        bio: parsed.bio?.trim() || null,
        status: "APPLICANT",
      },
    });

    // 7. Crear la actuación pendiente asociada en la fecha seleccionada
    const targetStageId = parsed.selectedStageId || contest.activeStageId || contest.stages[0]?.id;
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

    // 8. Notificar en tiempo real al panel del DJ / Jurados / Pantallas
    broadcastContestEvent(contest.id, contest.eventId, "CONTEST_PARTICIPANT_REGISTERED", {
      participant,
      performance,
      tableLabel: resolvedTableLabel,
      isRemote,
      paymentMethod: parsed.paymentMethod,
      paymentStatus,
    });

    const successMessage = isRemote
      ? `🎉 ¡Inscripción online recibida con éxito para "${parsed.name}"! Tu cupo ha quedado reservado.`
      : `🎉 ¡Postulación enviada con éxito desde ${resolvedTableLabel}! El DJ revisará tu tema para llamarte al escenario.`;

    return NextResponse.json({
      success: true,
      data: {
        participant,
        performance,
      },
      message: successMessage,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
