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
 * Actualiza el estado, título, tipo, fecha o notas de una fecha / gala
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) {
      throw new UnauthorizedError("Debes iniciar sesión para actualizar fechas");
    }

    const body = await req.json();
    const { stageId, status, title, stageType, date, notes, setActive } = body;

    if (!stageId) {
      return NextResponse.json({ success: false, error: "stageId requerido" }, { status: 400 });
    }

    const updatedStage = await prisma.contestStage.update({
      where: { id: stageId },
      data: {
        status: status || undefined,
        title: title ? title.trim() : undefined,
        stageType: stageType || undefined,
        date: date ? new Date(date) : undefined,
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
      message: `Gala "${updatedStage.title}" actualizada con éxito`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/contest/[id]/stages?stageId=...
 * Elimina una fecha / gala del concurso
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) {
      throw new UnauthorizedError("Debes iniciar sesión para eliminar fechas");
    }

    const { searchParams } = new URL(req.url);
    const stageId = searchParams.get("stageId");

    if (!stageId) {
      return NextResponse.json({ success: false, error: "stageId requerido" }, { status: 400 });
    }

    const stage = await prisma.contestStage.findFirst({
      where: { id: stageId, contestId: id },
    });
    if (!stage) throw new NotFoundError("Gala no encontrada");

    const contest = await prisma.karaokeContest.findUnique({
      where: { id },
      select: { activeStageId: true, eventId: true },
    });

    await prisma.contestStage.delete({ where: { id: stageId } });

    if (contest?.activeStageId === stageId) {
      const nextStage = await prisma.contestStage.findFirst({
        where: { contestId: id },
        orderBy: { orderIndex: "asc" },
      });
      await prisma.karaokeContest.update({
        where: { id },
        data: { activeStageId: nextStage?.id || null },
      });
    }

    broadcastContestEvent(id, contest?.eventId || null, "CONTEST_STAGE_CHANGE", {
      type: "STAGE_DELETED",
      stageId,
    });

    return NextResponse.json({
      success: true,
      message: `Gala "${stage.title}" eliminada correctamente`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
