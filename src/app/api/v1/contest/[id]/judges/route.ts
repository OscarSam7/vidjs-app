import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError, NotFoundError } from "@/lib/errors";
import { generateJudgePin } from "@/lib/contest/contest-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const JudgeSchema = z.object({
  name: z.string().min(2, "El nombre del jurado es obligatorio"),
  title: z.string().optional().nullable(),
  avatarUrl: z.string().optional().nullable(),
  canGoldenBuzzer: z.boolean().default(true),
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
 * Registra un nuevo jurado y le asigna un PIN único
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

    let pin = generateJudgePin();
    while (usedPins.has(pin)) {
      pin = generateJudgePin();
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

    return NextResponse.json({
      success: true,
      data: newJudge,
      message: `Jurado "${newJudge.name}" agregado con éxito con PIN ${newJudge.accessPin}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/contest/[id]/judges?judgeId=...
 * Elimina un jurado
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(req.url);
    const judgeId = searchParams.get("judgeId");
    if (!judgeId) {
      return NextResponse.json({ success: false, error: "judgeId requerido" }, { status: 400 });
    }

    await prisma.contestJudge.delete({ where: { id: judgeId } });
    return NextResponse.json({ success: true, message: "Jurado eliminado" });
  } catch (error) {
    return handleApiError(error);
  }
}
