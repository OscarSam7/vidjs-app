import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { qrToken, subscription } = body;

    if (!qrToken || !subscription) {
      return NextResponse.json(
        { success: false, error: "qrToken y subscription requeridos" },
        { status: 400 }
      );
    }

    const ticket = await prisma.beeperTicket.findUnique({
      where: { qrToken },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: "Llamador no encontrado" }, { status: 404 });
    }

    const updated = await prisma.beeperTicket.update({
      where: { qrToken },
      data: {
        pushSubscriptionJson: JSON.stringify(subscription),
      },
    });

    return NextResponse.json({ success: true, data: { id: updated.id } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar suscripción push" },
      { status: 500 }
    );
  }
}
