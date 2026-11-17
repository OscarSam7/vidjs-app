import { NextRequest, NextResponse } from "next/server";
import { rateBeeperTicket } from "@/lib/beeper/beeper-service";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const rating = Number(body.rating);

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: "Calificación inválida (1 a 5 estrellas)" },
        { status: 400 }
      );
    }

    const ticket = await prisma.beeperTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: "Llamador no encontrado" }, { status: 404 });
    }

    const updated = await rateBeeperTicket({
      qrToken: ticket.qrToken,
      rating,
      feedbackComment: body.feedbackComment,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al calificar servicio" },
      { status: 500 }
    );
  }
}
