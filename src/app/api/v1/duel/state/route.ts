import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, AppError } from "@/lib/errors";
import { getActiveDuel } from "@/lib/dj/duel-state";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const eventIdParam = searchParams.get("eventId");
    const eventCodeParam = searchParams.get("code");

    let eventId = eventIdParam;

    if (!eventId && eventCodeParam) {
      const event = await prisma.event.findUnique({
        where: { code: eventCodeParam },
        select: { id: true },
      });
      if (event) eventId = event.id;
    }

    if (!eventId) {
      throw new AppError("Se requiere eventId o code", 400);
    }

    const duel = getActiveDuel(eventId);

    return NextResponse.json({
      success: true,
      data: duel,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
