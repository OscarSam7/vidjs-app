import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError, BadRequestError } from "@/lib/errors";
import {
  DEFAULT_CONTEST_CRITERIA,
  generateContestCode,
  generateJudgePin,
} from "@/lib/contest/contest-service";

export const dynamic = "force-dynamic";

const CreateContestSchema = z.object({
  name: z.string().min(2, "El nombre del concurso es obligatorio"),
  description: z.string().optional().nullable(),
  coverUrl: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
  scoringMode: z.enum(["AVERAGE", "SUM", "OLYMPIC", "WEIGHTED"]).default("AVERAGE"),
  publicVoteWeight: z.number().min(0).max(50).default(0),
  rules: z.string().optional().nullable(),
  prizes: z.string().optional().nullable(),
  initialStageTitle: z.string().default("Gala 1: Audiciones y Clasificatorias"),
  judgesCount: z.number().min(1).max(10).default(3),
});

/**
 * GET /api/v1/contest
 * Lista todos los concursos de karaoke del tenant
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.tenantId) {
      throw new UnauthorizedError("Debes iniciar sesión para consultar concursos");
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");

    const where: any = { tenantId: session.tenantId };
    if (eventId) {
      where.eventId = eventId;
    }

    const contests = await prisma.karaokeContest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        stages: {
          orderBy: { orderIndex: "asc" },
        },
        _count: {
          select: {
            participants: true,
            judges: true,
            performances: true,
            criteria: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: contests,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/contest
 * Crea un nuevo concurso con criterios oficiales y jurados iniciales listos para operar
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session?.tenantId) {
      throw new UnauthorizedError("Debes iniciar sesión como DJ o Administrador");
    }

    const body = await req.json();
    const parsed = CreateContestSchema.parse(body);

    // Generar código único para el certamen
    let code = generateContestCode();
    let existing = await prisma.karaokeContest.findUnique({ where: { code } });
    while (existing) {
      code = generateContestCode();
      existing = await prisma.karaokeContest.findUnique({ where: { code } });
    }

    let targetEventId = parsed.eventId || null;
    if (!targetEventId) {
      const activeEvent = await prisma.event.findFirst({
        where: { tenantId: session.tenantId, status: "ACTIVE" },
        select: { id: true },
      });
      if (activeEvent) {
        targetEventId = activeEvent.id;
      }
    }

    // 1. Crear el certamen
    const contest = await prisma.karaokeContest.create({
      data: {
        tenantId: session.tenantId,
        eventId: targetEventId,
        name: parsed.name,
        description: parsed.description || null,
        coverUrl: parsed.coverUrl || null,
        code,
        status: "ACTIVE",
        scoringMode: parsed.scoringMode,
        publicVoteWeight: parsed.publicVoteWeight,
        rules: parsed.rules || null,
        prizes: parsed.prizes || null,
      },
    });

    // 2. Crear criterios de evaluación predeterminados
    await prisma.contestCriteria.createMany({
      data: DEFAULT_CONTEST_CRITERIA.map((crit) => ({
        contestId: contest.id,
        name: crit.name,
        description: crit.description,
        maxScore: crit.maxScore,
        weight: crit.weight,
        orderIndex: crit.orderIndex,
        active: true,
      })),
    });

    // 3. Crear primera fecha / gala
    const stage = await prisma.contestStage.create({
      data: {
        contestId: contest.id,
        title: parsed.initialStageTitle,
        stageType: "QUALIFIERS",
        status: "LIVE",
        orderIndex: 0,
        notes: "Gala de apertura",
      },
    });

    // Actualizar stage activo en el concurso
    await prisma.karaokeContest.update({
      where: { id: contest.id },
      data: { activeStageId: stage.id },
    });

    // 4. Crear jurados iniciales con PINs de acceso directo
    const initialJudges = [];
    const usedPins = new Set<string>();

    for (let i = 1; i <= parsed.judgesCount; i++) {
      let pin = generateJudgePin();
      while (usedPins.has(pin)) {
        pin = generateJudgePin();
      }
      usedPins.add(pin);

      initialJudges.push({
        contestId: contest.id,
        name: `Jurado ${i}`,
        title: i === 1 ? "Presidente del Jurado" : "Vocal Coach",
        accessPin: pin,
        canGoldenBuzzer: true,
        active: true,
      });
    }

    await prisma.contestJudge.createMany({
      data: initialJudges,
    });

    // Retornar concurso completo con sus relaciones
    const fullContest = await prisma.karaokeContest.findUnique({
      where: { id: contest.id },
      include: {
        stages: true,
        criteria: true,
        judges: true,
        participants: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: fullContest,
      message: `🎉 ¡Concurso "${contest.name}" creado con éxito con código ${code}!`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
