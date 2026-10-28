import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { handleApiError, UnauthorizedError } from "@/lib/errors";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const CriteriaSchema = z.object({
  name: z.string().min(2, "El nombre del criterio es obligatorio"),
  description: z.string().optional().nullable(),
  maxScore: z.number().min(1).max(100).default(10),
  weight: z.number().min(0.1).max(5).default(1.0),
  orderIndex: z.number().optional(),
});

/**
 * GET /api/v1/contest/[id]/criteria
 * Obtiene los criterios de evaluación del certamen
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const criteria = await prisma.contestCriteria.findMany({
      where: { contestId: id },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({ success: true, data: criteria });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * POST /api/v1/contest/[id]/criteria
 * Agrega un nuevo criterio personalizado de evaluación
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) throw new UnauthorizedError("No autorizado");

    const body = await req.json();
    const parsed = CriteriaSchema.parse(body);

    const count = await prisma.contestCriteria.count({ where: { contestId: id } });

    const newCriteria = await prisma.contestCriteria.create({
      data: {
        contestId: id,
        name: parsed.name,
        description: parsed.description || null,
        maxScore: parsed.maxScore,
        weight: parsed.weight,
        orderIndex: parsed.orderIndex !== undefined ? parsed.orderIndex : count,
        active: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: newCriteria,
      message: `Criterio "${newCriteria.name}" añadido exitosamente`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * PUT /api/v1/contest/[id]/criteria
 * Actualiza en lote o edita criterios existentes
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getCurrentSession();
    if (!session?.tenantId) throw new UnauthorizedError("No autorizado");

    const body = await req.json();
    const { criteriaList } = body;

    if (!Array.isArray(criteriaList)) {
      return NextResponse.json(
        { success: false, error: "criteriaList debe ser un arreglo" },
        { status: 400 }
      );
    }

    // Actualizar cada criterio
    for (const c of criteriaList) {
      if (c.id) {
        await prisma.contestCriteria.update({
          where: { id: c.id },
          data: {
            name: c.name !== undefined ? c.name : undefined,
            description: c.description !== undefined ? c.description : undefined,
            maxScore: c.maxScore !== undefined ? c.maxScore : undefined,
            weight: c.weight !== undefined ? c.weight : undefined,
            orderIndex: c.orderIndex !== undefined ? c.orderIndex : undefined,
            active: c.active !== undefined ? c.active : undefined,
          },
        });
      }
    }

    const updated = await prisma.contestCriteria.findMany({
      where: { contestId: id },
      orderBy: { orderIndex: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Criterios actualizados con éxito",
    });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * DELETE /api/v1/contest/[id]/criteria?criteriaId=...
 * Elimina un criterio
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { searchParams } = new URL(req.url);
    const criteriaId = searchParams.get("criteriaId");

    if (!criteriaId) {
      return NextResponse.json({ success: false, error: "criteriaId requerido" }, { status: 400 });
    }

    await prisma.contestCriteria.delete({
      where: { id: criteriaId },
    });

    return NextResponse.json({ success: true, message: "Criterio eliminado" });
  } catch (error) {
    return handleApiError(error);
  }
}
