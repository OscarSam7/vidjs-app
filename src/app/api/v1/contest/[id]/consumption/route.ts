import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { broadcastContestEvent } from "@/lib/contest/contest-service";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ConsumptionUpdateSchema = z.object({
  tableLabel: z.string().optional(),
  status: z.enum(["PENDING", "VERIFIED", "SUPER_VOTE"]).optional(),
  consumptionAmount: z.number().optional(),
  notes: z.string().optional().nullable(),
  verifiedBy: z.string().optional().nullable(),
  requireConsumption: z.boolean().optional(),
  minConsumptionNotes: z.string().optional().nullable(),
});

/**
 * GET /api/v1/contest/[id]/consumption
 * Lista el estado de consumo de cada mesa para el concurso (PENDING, VERIFIED, SUPER_VOTE)
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const tableLabel = searchParams.get("tableLabel");

    const contest = await prisma.karaokeContest.findFirst({
      where: { OR: [{ id }, { code: id }] },
      include: {
        tenant: {
          include: {
            tables: {
              where: { active: true },
              orderBy: { number: "asc" },
            },
          },
        },
        tableConsumptions: true,
      },
    });

    if (!contest) throw new NotFoundError("Concurso no encontrado");

    // Si se consulta una mesa específica (e.g. desde la app de comensales)
    if (tableLabel) {
      const consumption = contest.tableConsumptions.find(
        (c) => c.tableLabel.toLowerCase() === tableLabel.toLowerCase()
      );

      return NextResponse.json({
        success: true,
        data: {
          tableLabel,
          requireConsumption: contest.requireConsumption,
          minConsumptionNotes: contest.minConsumptionNotes,
          status: consumption?.status || (contest.requireConsumption ? "PENDING" : "VERIFIED"),
          isSuperVote: consumption?.status === "SUPER_VOTE",
          notes: consumption?.notes || null,
          consumptionAmount: consumption?.consumptionAmount || 0,
        },
      });
    }

    // Mapa de consumos por mesa
    const consumptionMap = new Map<string, any>();
    contest.tableConsumptions.forEach((c) => {
      consumptionMap.set(c.tableLabel.toLowerCase(), c);
    });

    // Consolidar con las mesas reales registradas en el local
    const allTables = contest.tenant.tables.map((t) => {
      const label = t.label || `Mesa ${t.number}`;
      const record = consumptionMap.get(label.toLowerCase());

      return {
        id: t.id,
        number: t.number,
        label,
        zone: t.zone,
        status: record?.status || "PENDING",
        isSuperVote: record?.status === "SUPER_VOTE",
        notes: record?.notes || null,
        consumptionAmount: record?.consumptionAmount || 0,
        verifiedBy: record?.verifiedBy || null,
        updatedAt: record?.updatedAt || null,
      };
    });

    // Agregar también mesas que pudieran haber sido registradas manualmente
    contest.tableConsumptions.forEach((c) => {
      const exists = allTables.some((t) => t.label.toLowerCase() === c.tableLabel.toLowerCase());
      if (!exists) {
        allTables.push({
          id: c.id,
          number: 0,
          label: c.tableLabel,
          zone: "MAIN",
          status: c.status,
          isSuperVote: c.status === "SUPER_VOTE",
          notes: c.notes,
          consumptionAmount: c.consumptionAmount,
          verifiedBy: c.verifiedBy,
          updatedAt: c.updatedAt,
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        requireConsumption: contest.requireConsumption,
        minConsumptionNotes: contest.minConsumptionNotes,
        tables: allTables,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/contest/[id]/consumption
 * Permite al mozo, cajero o DJ validar el consumo mínimo o activar Súper Votos
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = ConsumptionUpdateSchema.parse(body);

    const contest = await prisma.karaokeContest.findFirst({
      where: { OR: [{ id }, { code: id }] },
    });
    if (!contest) throw new NotFoundError("Concurso no encontrado");

    // 1. Si se actualiza la regla global de consumo mínimo
    if (parsed.requireConsumption !== undefined || parsed.minConsumptionNotes !== undefined) {
      const updatedContest = await prisma.karaokeContest.update({
        where: { id: contest.id },
        data: {
          requireConsumption: parsed.requireConsumption !== undefined ? parsed.requireConsumption : undefined,
          minConsumptionNotes: parsed.minConsumptionNotes !== undefined ? parsed.minConsumptionNotes : undefined,
        },
      });

      broadcastContestEvent(contest.id, contest.eventId, "CONTEST_STAGE_CHANGE", {
        type: "CONSUMPTION_RULE_UPDATE",
        requireConsumption: updatedContest.requireConsumption,
        minConsumptionNotes: updatedContest.minConsumptionNotes,
      });

      return NextResponse.json({
        success: true,
        message: "Reglas de consumo del certamen actualizadas",
        data: {
          requireConsumption: updatedContest.requireConsumption,
          minConsumptionNotes: updatedContest.minConsumptionNotes,
        },
      });
    }

    // 2. Si se actualiza el estado de una mesa concreta
    if (!parsed.tableLabel || !parsed.status) {
      return NextResponse.json(
        { success: false, error: "tableLabel y status son requeridos para actualizar una mesa" },
        { status: 400 }
      );
    }

    const consumption = await prisma.contestTableConsumption.upsert({
      where: {
        contestId_tableLabel: {
          contestId: contest.id,
          tableLabel: parsed.tableLabel,
        },
      },
      create: {
        contestId: contest.id,
        tableLabel: parsed.tableLabel,
        status: parsed.status,
        consumptionAmount: parsed.consumptionAmount || 0,
        notes: parsed.notes || null,
        verifiedBy: parsed.verifiedBy || "Staff / Mozo",
      },
      update: {
        status: parsed.status,
        consumptionAmount:
          parsed.consumptionAmount !== undefined ? parsed.consumptionAmount : undefined,
        notes: parsed.notes !== undefined ? parsed.notes : undefined,
        verifiedBy: parsed.verifiedBy || "Staff / Mozo",
      },
    });

    // Difundir en tiempo real a todos los comensales de la mesa y al panel del DJ
    broadcastContestEvent(contest.id, contest.eventId, "CONTEST_VOTE_UPDATE", {
      type: "TABLE_CONSUMPTION_UPDATE",
      tableLabel: parsed.tableLabel,
      status: parsed.status,
      isSuperVote: parsed.status === "SUPER_VOTE",
      notes: parsed.notes,
      verifiedBy: parsed.verifiedBy,
    });

    const statusMessage =
      parsed.status === "SUPER_VOTE"
        ? `🌟 ¡SÚPER VOTO (x2) activado para ${parsed.tableLabel} por consumo especial!`
        : parsed.status === "VERIFIED"
        ? `✅ Consumo mínimo verificado para ${parsed.tableLabel}. Votos individuales habilitados.`
        : `🔒 Votos bloqueados para ${parsed.tableLabel} (esperando consumo).`;

    return NextResponse.json({
      success: true,
      data: consumption,
      message: statusMessage,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
