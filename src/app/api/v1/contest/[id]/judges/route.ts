import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError, NotFoundError, BadRequestError } from "@/lib/errors";
import { generateJudgePin, broadcastContestEvent } from "@/lib/contest/contest-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const JudgeSchema = z.object({
  name: z.string().min(2, "El nombre del jurado es obligatorio"),
  title: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  accessPin: z.string().regex(/^\d{4}$/, "El PIN debe tener 4 dígitos numéricos").optional().nullable(),
  canGoldenBuzzer: z.boolean().default(true),
});

const UpdateJudgeSchema = z.object({
  judgeId: z.string().min(1, "judgeId requerido"),
  name: z.string().min(2, "El nombre del jurado es obligatorio").optional(),
  title: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  accessPin: z.string().regex(/^\d{4}$/, "El PIN debe tener 4 dígitos numéricos").optional(),
  canGoldenBuzzer: z.boolean().optional(),
  active: z.boolean().optional(),
});

/**
 * GET /api/v1/contest/[id]/judges
 * Lista todos los jurados del certamen con sus PINs y enlaces de acceso móvil
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const contest = await prisma.karaokeContest.findUnique({
      where: { id },
      select: { id: true, code: true, name: true },
    });
    if (!contest) throw new NotFoundError("Concurso no encontrado");

    const judges = await prisma.contestJudge.findMany({
      where: { contestId: id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { scores: true } },
      },
    });

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";

    const enhancedJudges = judges.map((judge) => ({
      ...judge,
      accessUrl: `${protocol}://${host}/judge/${contest.code}?pin=${judge.accessPin}`,
    }));

    return NextResponse.json({ success: true, data: enhancedJudges });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/contest/[id]/judges
 * Registra un nuevo jurado y le asigna o valida un PIN único
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) throw new UnauthorizedError("No autorizado");

    const body = await req.json();
    const parsed = JudgeSchema.parse(body);

    const existingJudges = await prisma.contestJudge.findMany({
      where: { contestId: id },
      select: { accessPin: true },
    });
    const usedPins = new Set(existingJudges.map((j) => j.accessPin));

    let pin = parsed.accessPin || "";
    if (pin) {
      if (usedPins.has(pin)) {
        throw new BadRequestError(`El PIN "${pin}" ya está en uso por otro jurado en este certamen`);
      }
    } else {
      pin = generateJudgePin();
      while (usedPins.has(pin)) {
        pin = generateJudgePin();
      }
    }

    const newJudge = await prisma.contestJudge.create({
      data: {
        contestId: id,
        name: parsed.name,
        title: parsed.title || "Jurado Oficial",
        avatarUrl: parsed.avatarUrl || null,
        accessPin: pin,
        canGoldenBuzzer: parsed.canGoldenBuzzer,
        active: true,
      },
    });

    const contest = await prisma.karaokeContest.findUnique({
      where: { id },
      select: { code: true, eventId: true },
    });

    if (contest) {
      broadcastContestEvent(id, contest.eventId, "CONTEST_STAGE_CHANGE", {
        type: "JUDGE_CREATED",
        judgeId: newJudge.id,
      });
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";

    return NextResponse.json({
      success: true,
      data: {
        ...newJudge,
        accessUrl: `${protocol}://${host}/judge/${contest?.code || id}?pin=${newJudge.accessPin}`,
      },
      message: `Jurado "${newJudge.name}" agregado con éxito con PIN ${newJudge.accessPin}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PATCH /api/v1/contest/[id]/judges
 * Edita los datos de un jurado (nombre, cargo, PIN, golden buzzer)
 */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) throw new UnauthorizedError("No autorizado");

    const body = await req.json();
    const parsed = UpdateJudgeSchema.parse(body);

    const judge = await prisma.contestJudge.findFirst({
      where: { id: parsed.judgeId, contestId: id },
    });
    if (!judge) throw new NotFoundError("Jurado no encontrado");

    // Si modifica el PIN, verificar que no colisione con otro jurado
    if (parsed.accessPin && parsed.accessPin !== judge.accessPin) {
      const pinConflict = await prisma.contestJudge.findFirst({
        where: {
          contestId: id,
          accessPin: parsed.accessPin,
          id: { not: parsed.judgeId },
        },
      });
      if (pinConflict) {
        throw new BadRequestError(`El PIN "${parsed.accessPin}" ya está en uso por otro jurado`);
      }
    }

    const updated = await prisma.contestJudge.update({
      where: { id: parsed.judgeId },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.title !== undefined && { title: parsed.title }),
        ...(parsed.avatarUrl !== undefined && { avatarUrl: parsed.avatarUrl }),
        ...(parsed.accessPin !== undefined && { accessPin: parsed.accessPin }),
        ...(parsed.canGoldenBuzzer !== undefined && { canGoldenBuzzer: parsed.canGoldenBuzzer }),
        ...(parsed.active !== undefined && { active: parsed.active }),
      },
    });

    const contest = await prisma.karaokeContest.findUnique({
      where: { id },
      select: { code: true, eventId: true },
    });

    if (contest) {
      broadcastContestEvent(id, contest.eventId, "CONTEST_STAGE_CHANGE", {
        type: "JUDGE_UPDATED",
        judgeId: updated.id,
      });
    }

    const host = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        accessUrl: `${protocol}://${host}/judge/${contest?.code || id}?pin=${updated.accessPin}`,
      },
      message: `Jurado "${updated.name}" actualizado con éxito`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/contest/[id]/judges?judgeId=...
 * Elimina un jurado del certamen
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) throw new UnauthorizedError("No autorizado");

    const { searchParams } = new URL(req.url);
    const judgeId = searchParams.get("judgeId");
    if (!judgeId) {
      return NextResponse.json({ success: false, error: "judgeId requerido" }, { status: 400 });
    }

    const judge = await prisma.contestJudge.findFirst({
      where: { id: judgeId, contestId: id },
    });
    if (!judge) throw new NotFoundError("Jurado no encontrado");

    await prisma.contestJudge.delete({ where: { id: judgeId } });

    const contest = await prisma.karaokeContest.findUnique({
      where: { id },
      select: { eventId: true },
    });
    if (contest) {
      broadcastContestEvent(id, contest.eventId, "CONTEST_STAGE_CHANGE", {
        type: "JUDGE_DELETED",
        judgeId,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Jurado "${judge.name}" eliminado correctamente`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
