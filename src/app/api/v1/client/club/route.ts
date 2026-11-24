import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import {
  getCurrentClientSession,
  generateRedemptionCode,
} from "@/lib/client/client-auth";

const redeemSchema = z.object({
  action: z.literal("redeem"),
  rewardId: z.string().min(1),
});

const STARTER_GLOBAL_REWARDS = [
  {
    title: "Fast-Pass Karaoke / Pedido DJ",
    description: "Prioridad directa en la cola musical de cualquier local CYNKO adherido.",
    pointsCost: 150,
    category: "FASTPASS",
  },
  {
    title: "Trago de Bienvenida CYNKO Club",
    description: "Canjeable en barra mostrando tu cupón QR en locales participantes.",
    pointsCost: 300,
    category: "DRINK",
  },
  {
    title: "20% OFF en Entradas & Mesas VIP",
    description: "Descuento exclusivo para miembros CYNKO Club en eventos oficiales.",
    pointsCost: 500,
    category: "DISCOUNT",
  },
  {
    title: "Pase VIP Sin Fila (2 Personas)",
    description: "Acceso preferencial para ti y un acompañante en fechas seleccionadas.",
    pointsCost: 900,
    category: "VIP",
  },
];

export async function GET() {
  try {
    let rewards = await prisma.clubReward.findMany({
      where: { active: true },
      include: {
        tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
      },
      orderBy: [{ tenantId: "asc" }, { pointsCost: "asc" }],
    });

    // Auto-sembrar premios iniciales globales de CYNKO Club si todavía no existe ninguno
    if (rewards.length === 0) {
      await prisma.clubReward.createMany({
        data: STARTER_GLOBAL_REWARDS.map((r) => ({
          ...r,
          tenantId: null,
          active: true,
        })),
      });
      rewards = await prisma.clubReward.findMany({
        where: { active: true },
        include: {
          tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
        orderBy: [{ tenantId: "asc" }, { pointsCost: "asc" }],
      });
    }

    return NextResponse.json({ success: true, rewards });
  } catch (error) {
    console.error("[CLIENT_CLUB_GET_ERROR]", error);
    return NextResponse.json({ error: "Error cargando premios de CYNKO Club" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentClientSession();
    if (!session) {
      return NextResponse.json(
        { error: "Inicia sesión con tu cuenta CYNKO para canjear premios." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = redeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Premio inválido" }, { status: 400 });
    }

    const reward = await prisma.clubReward.findUnique({
      where: { id: parsed.data.rewardId },
      include: { tenant: { select: { id: true, name: true } } },
    });

    if (!reward || !reward.active) {
      return NextResponse.json({ error: "Este premio ya no está disponible." }, { status: 404 });
    }

    if (reward.stock !== null && reward.stock <= 0) {
      return NextResponse.json({ error: "Premio agotado temporalmente." }, { status: 400 });
    }

    const client = await prisma.clientMember.findUnique({
      where: { id: session.sub },
    });

    if (!client) {
      return NextResponse.json({ error: "Cuenta de cliente no encontrada" }, { status: 404 });
    }

    // Verificar puntos (si es premio de local, puede usar puntos del local o globales)
    let venueMembership = reward.tenantId
      ? await prisma.clientVenueMembership.findUnique({
          where: {
            clientId_tenantId: {
              clientId: client.id,
              tenantId: reward.tenantId,
            },
          },
        })
      : null;

    const useVenuePoints = Boolean(venueMembership && venueMembership.points >= reward.pointsCost);
    if (!useVenuePoints && client.globalPoints < reward.pointsCost) {
      return NextResponse.json(
        {
          error: `Te faltan ${reward.pointsCost - client.globalPoints} puntos para canjear "${reward.title}".`,
        },
        { status: 400 }
      );
    }

    const redemption = await prisma.$transaction(async (tx) => {
      if (useVenuePoints && venueMembership) {
        await tx.clientVenueMembership.update({
          where: { id: venueMembership.id },
          data: { points: { decrement: reward.pointsCost } },
        });
      } else {
        await tx.clientMember.update({
          where: { id: client.id },
          data: { globalPoints: { decrement: reward.pointsCost } },
        });
      }

      if (reward.stock !== null) {
        await tx.clubReward.update({
          where: { id: reward.id },
          data: { stock: { decrement: 1 } },
        });
      }

      const created = await tx.clubRedemption.create({
        data: {
          code: generateRedemptionCode(),
          clientId: client.id,
          rewardId: reward.id,
          tenantId: reward.tenantId,
          pointsSpent: reward.pointsCost,
          status: "ACTIVE",
        },
        include: {
          reward: { select: { id: true, title: true, category: true, pointsCost: true } },
          tenant: { select: { id: true, name: true } },
        },
      });

      await tx.clubPointTransaction.create({
        data: {
          clientId: client.id,
          tenantId: reward.tenantId,
          points: -reward.pointsCost,
          type: "REDEMPTION",
          description: `Canje: ${reward.title}${reward.tenant ? ` (${reward.tenant.name})` : ""}`,
        },
      });

      return created;
    });

    return NextResponse.json({
      success: true,
      redemption,
      message: `¡Premio canjeado! Muestra el código ${redemption.code} en caja o barra.`,
    });
  } catch (error) {
    console.error("[CLIENT_CLUB_REDEEM_ERROR]", error);
    return NextResponse.json({ error: "Error al procesar el canje" }, { status: 500 });
  }
}
