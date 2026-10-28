import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError, NotFoundError } from "@/lib/errors";
import { broadcastContestEvent } from "@/lib/contest/contest-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const StageSchema = z.object({
  title: z.string().min(2, "El título de la fecha o gala es obligatorio"),
  stageType: z.enum(["AUDITIONS", "QUALIFIERS", "SEMIFINALS", "FINALS"]).default("QUALIFIERS"),
  date: z.string().optional(),
  status: z.enum(["SCHEDULED", "LIVE", "COMPLETED"]).default("SCHEDULED"),
  notes: z.string().optional().nullable(),
  setActive: z.boolean().default(false),
});

/**
 * GET /api/v1/contest/[id]/stages
 * Lista las fechas / galas del concurso
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const stages = await prisma.contestStage.findMany({
      where: { contestId: id },
      orderBy: { orderIndex: "asc" },
      include: {
        performances: {
          orderBy: { orderIndex: "asc" },
          include: { participant: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: stages,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/contest/[id]/stages
 * Agrega una nueva fecha / gala al torneo
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) {
      throw new UnauthorizedError("Debes iniciar sesión para agregar fechas");
    }

    const body = await req.json();
    const parsed = StageSchema.parse(body);

    const contest = await prisma.karaokeContest.findUnique({
      where: { id },
      include: { _count: { select: { stages: true } } },
    });
    if (!contest) throw new NotFoundError("Concurso no encontrado");

    const newStage = await prisma.contestStage.create({
      data: {
        contestId: id,
        title: parsed.title,
        stageType: parsed.stageType,
        date: parsed.date ? new Date(parsed.date) : new Date(),
        status: parsed.status,
        orderIndex: contest._count.stages,
        notes: parsed.notes || null,
      },
    });

    if (parsed.setActive || parsed.status === "LIVE") {
      await prisma.karaokeContest.update({
        where: { id },
        data: { activeStageId: newStage.id },
      });
    }

    broadcastContestEvent(id, contest.eventId, "CONTEST_STAGE_CHANGE", {
      stage: newStage,
    });

    return NextResponse.json({
      success: true,
      data: newStage,
      message: `📅 ¡Gala "${newStage.title}" creada con éxito!`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/contest/[id]/stages
 * Actualiza el estado de una fecha o la activa como fecha en vivo
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) {
      throw new UnauthorizedError("Debes iniciar sesión para actualizar fechas");
    }

    const body = await req.json();
    const { stageId, status, title, notes, setActive } = body;

    if (!stageId) {
      return NextResponse.json({ success: false, error: "stageId requerido" }, { status: 400 });
    }

    const updatedStage = await prisma.contestStage.update({
      where: { id: stageId },
      data: {
        status: status || undefined,
        title: title || undefined,
        notes: notes !== undefined ? notes : undefined,
      },
    });

    if (setActive || status === "LIVE") {
      await prisma.karaokeContest.update({
        where: { id },
        data: { activeStageId: stageId },
      });
    }

    const contest = await prisma.karaokeContest.findUnique({ where: { id } });
    broadcastContestEvent(id, contest?.eventId || null, "CONTEST_STAGE_CHANGE", {
      stage: updatedStage,
    });

    return NextResponse.json({
      success: true,
      data: updatedStage,
      message: "Gala actualizada con éxito",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
