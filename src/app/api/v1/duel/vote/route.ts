import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { handleApiError, UnauthorizedError, AppError } from "@/lib/errors";
import { voteInDuel } from "@/lib/dj/duel-state";
import { realtimeBus } from "@/lib/realtime/event-bus";

const voteSchema = z.object({
  duelId: z.string(),
  option: z.enum(["A", "B"]),
});

export async function POST(req: NextRequest) {
  try {
    const guestSession = await getCurrentGuestSession();
    if (!guestSession) {
      throw new UnauthorizedError("Debes escanear el código QR de tu mesa para poder votar en los duelos.");
    }

    const body = await req.json();
    const data = voteSchema.parse(body);

    const result = voteInDuel({
      eventId: guestSession.eventId,
      duelId: data.duelId,
      sessionToken: guestSession.sessionToken,
      option: data.option,
    });

    // Broadcast instantáneo en 0 ms para pantallas TV, cabina DJ y comensales
    realtimeBus.broadcast(guestSession.eventId, "DUEL_UPDATE", result.duel);

    return NextResponse.json({
      success: true,
      message: result.message,
      data: result.duel,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
