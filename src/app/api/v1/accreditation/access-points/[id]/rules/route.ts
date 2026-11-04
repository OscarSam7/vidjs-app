import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requirePermission } from "@/lib/auth/session";
import { handleApiError, NotFoundError } from "@/lib/errors";

const rulesUpdateSchema = z.object({
  rules: z.array(
    z.object({
      accreditationTypeId: z.string(),
      allowed: z.boolean(),
    })
  ),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { tenantId } = await requireTenantContext();
    await requirePermission("accreditations:manage");
    const { id: accessPointId } = await params;

    const accessPoint = await prisma.accessPoint.findFirst({
      where: { id: accessPointId, tenantId },
    });
    if (!accessPoint) {
      throw new NotFoundError("Punto de acceso no encontrado");
    }

    const body = await req.json();
    const parsed = rulesUpdateSchema.parse(body);

    for (const rule of parsed.rules) {
      const existing = await prisma.accessPointRule.findUnique({
        where: {
          accessPointId_accreditationTypeId: {
            accessPointId,
            accreditationTypeId: rule.accreditationTypeId,
          },
        },
      });

      if (existing) {
        await prisma.accessPointRule.update({
          where: { id: existing.id },
          data: { isAllowed: rule.allowed },
        });
      } else {
        await prisma.accessPointRule.create({
          data: {
            accessPointId,
            accreditationTypeId: rule.accreditationTypeId,
            isAllowed: rule.allowed,
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: "Reglas de acceso actualizadas" });
  } catch (error) {
    return handleApiError(error);
  }
}
