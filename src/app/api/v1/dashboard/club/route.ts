import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { calculateClubTier } from "@/lib/client/client-auth";
import { sanitizeText } from "@/lib/security/sanitize";

const awardPointsSchema = z.object({
  action: z.literal("award_points"),
  cynkoCode: z.string().min(3).max(30),
  points: z.coerce.number().int().min(1).max(50000),
  amountCents: z.coerce.number().int().min(0).optional(),
  description: z.string().max(160).optional(),
});

const createRewardSchema = z.object({
  action: z.literal("create_reward"),
  title: z.string().min(2).max(100),
  description: z.string().max(240).optional(),
  pointsCost: z.coerce.number().int().min(10).max(100000),
  category: z.enum(["DRINK", "TICKET", "VIP", "FASTPASS", "DISCOUNT"]).default("DRINK"),
});

const validateRedemptionSchema = z.object({
  action: z.literal("validate_redemption"),
  code: z.string().min(4).max(30),
});

const createFlashDealSchema = z.object({
  action: z.literal("create_flash_deal"),
  title: z.string().min(2).max(100),
  subtitle: z.string().max(200).optional(),
  discountLabel: z.string().min(2).max(30),
  durationHours: z.coerce.number().min(1).max(72).default(3),
  minTier: z.enum(["BRONCE", "PLATA", "ORO", "BLACK"]).default("BRONCE"),
});

async function resolveTenantId(session: { tenantId: string | null; role: string }) {
  if (session.tenantId) return session.tenantId;
  if (session.role === "SUPER_ADMIN") {
    const first = await prisma.tenant.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    return first?.id || null;
  }
  return null;
}

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenantId = await resolveTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Establecimiento no encontrado" }, { status: 400 });
    }

    const [rewards, flashDeals, topClients, recentRedemptions] = await Promise.all([
      prisma.clubReward.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clubFlashDeal.findMany({
        where: { tenantId, active: true, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.clientVenueMembership.findMany({
        where: { tenantId },
        include: {
          client: {
            select: { id: true, name: true, email: true, cynkoCode: true, tier: true, globalPoints: true },
          },
        },
        orderBy: { points: "desc" },
        take: 25,
      }),
      prisma.clubRedemption.findMany({
        where: {
          OR: [{ tenantId }, { tenantId: null }],
        },
        include: {
          client: { select: { name: true, cynkoCode: true } },
          reward: { select: { title: true, category: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { rewards, flashDeals, topClients, recentRedemptions },
    });
  } catch (error) {
    console.error("[DASHBOARD_CLUB_GET_ERROR]", error);
    return NextResponse.json({ error: "Error cargando CYNKO Club del local" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenantId = await resolveTenantId(session);
    if (!tenantId) {
      return NextResponse.json({ error: "Establecimiento no encontrado" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true },
    });

    const body = await req.json();

    // 1. Acreditar puntos por consumo escaneando/ingresando el CYNKO ID del cliente
    if (body?.action === "award_points") {
      const parsed = awardPointsSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Datos inválidos para acreditar puntos" }, { status: 400 });
      }

      const code = sanitizeText(parsed.data.cynkoCode).toUpperCase().trim();
      const client = await prisma.clientMember.findFirst({
        where: {
          OR: [{ cynkoCode: code }, { email: code.toLowerCase() }],
        },
      });

      if (!client) {
        return NextResponse.json(
          { error: `No existe ningún cliente con código o correo "${code}".` },
          { status: 404 }
        );
      }

      const pts = parsed.data.points;
      const newLifetime = client.lifetimePoints + pts;
      const newTier = calculateClubTier(newLifetime);

      await prisma.$transaction(async (tx) => {
        await tx.clientMember.update({
          where: { id: client.id },
          data: {
            globalPoints: { increment: pts },
            lifetimePoints: { increment: pts },
            tier: newTier,
          },
        });

        await tx.clientVenueMembership.upsert({
          where: {
            clientId_tenantId: {
              clientId: client.id,
              tenantId,
            },
          },
          create: {
            clientId: client.id,
            tenantId,
            points: pts,
            visits: 1,
            totalSpentCents: parsed.data.amountCents || 0,
            lastVisitAt: new Date(),
          },
          update: {
            points: { increment: pts },
            visits: { increment: 1 },
            totalSpentCents: { increment: parsed.data.amountCents || 0 },
            lastVisitAt: new Date(),
          },
        });

        await tx.clubPointTransaction.create({
          data: {
            clientId: client.id,
            tenantId,
            points: pts,
            type: "CONSUMPTION",
            amountCents: parsed.data.amountCents || null,
            description:
              parsed.data.description?.trim() ||
              `Consumo en ${tenant?.name || "Local CYNKO"}`,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: `Se acreditaron +${pts} pts a ${client.name} (${client.cynkoCode}) • Nivel ${newTier}.`,
      });
    }

    // 2. Crear premio del local
    if (body?.action === "create_reward") {
      const parsed = createRewardSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Datos del premio inválidos" }, { status: 400 });
      }

      const reward = await prisma.clubReward.create({
        data: {
          tenantId,
          title: sanitizeText(parsed.data.title).trim(),
          description: parsed.data.description ? sanitizeText(parsed.data.description).trim() : null,
          pointsCost: parsed.data.pointsCost,
          category: parsed.data.category,
          active: true,
        },
      });

      return NextResponse.json({ success: true, reward });
    }

    // 3. Eliminar premio
    if (body?.action === "delete_reward" && typeof body.rewardId === "string") {
      await prisma.clubReward.deleteMany({
        where: { id: body.rewardId, tenantId },
      });
      return NextResponse.json({ success: true });
    }

    // 4. Validar cupón de canje en caja/barra
    if (body?.action === "validate_redemption") {
      const parsed = validateRedemptionSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Código de cupón inválido" }, { status: 400 });
      }

      const code = sanitizeText(parsed.data.code).toUpperCase().trim();
      const redemption = await prisma.clubRedemption.findUnique({
        where: { code },
        include: {
          client: { select: { name: true, cynkoCode: true } },
          reward: { select: { title: true } },
        },
      });

      if (!redemption) {
        return NextResponse.json({ error: `Cupón "${code}" no encontrado.` }, { status: 404 });
      }

      if (redemption.status === "USED") {
        return NextResponse.json(
          { error: `El cupón ${code} ya fue utilizado anteriormente.` },
          { status: 400 }
        );
      }

      await prisma.clubRedemption.update({
        where: { id: redemption.id },
        data: { status: "USED", usedAt: new Date() },
      });

      return NextResponse.json({
        success: true,
        message: `✅ Cupón válido: "${redemption.reward.title}" entregado a ${redemption.client.name}.`,
      });
    }

    // 5. Lanzar Flash Deal de último minuto (Fase 3)
    if (body?.action === "create_flash_deal") {
      const parsed = createFlashDealSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Datos del Flash Deal inválidos" }, { status: 400 });
      }

      const expiresAt = new Date(Date.now() + parsed.data.durationHours * 60 * 60 * 1000);
      const deal = await prisma.clubFlashDeal.create({
        data: {
          tenantId,
          title: sanitizeText(parsed.data.title).trim(),
          subtitle: parsed.data.subtitle ? sanitizeText(parsed.data.subtitle).trim() : null,
          discountLabel: sanitizeText(parsed.data.discountLabel).toUpperCase().trim(),
          minTier: parsed.data.minTier,
          expiresAt,
          active: true,
        },
      });

      return NextResponse.json({ success: true, deal });
    }

    // 6. Finalizar Flash Deal
    if (body?.action === "delete_flash_deal" && typeof body.dealId === "string") {
      await prisma.clubFlashDeal.updateMany({
        where: { id: body.dealId, tenantId },
        data: { active: false },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("[DASHBOARD_CLUB_POST_ERROR]", error);
    return NextResponse.json({ error: "Error procesando operación de CYNKO Club" }, { status: 500 });
  }
}
