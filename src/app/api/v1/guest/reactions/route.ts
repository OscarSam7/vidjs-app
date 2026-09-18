import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { handleApiError, UnauthorizedError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { randomUUID } from "crypto";

const reactionSchema = z.object({
  reaction: z.string().min(1).max(8),
});

const ALLOWED_REACTIONS = ["🔥", "❤️", "👏", "🍻", "💃", "🎤", "⭐", "🎉"];

export async function POST(req: NextRequest) {
  try {
    const guestSession = await getCurrentGuestSession();
    if (!guestSession) {
      throw new UnauthorizedError("Debes escanear el QR de tu mesa para reaccionar.");
    }

    const body = await req.json();
    const data = reactionSchema.parse(body);

    const safeReaction = ALLOWED_REACTIONS.includes(data.reaction) ? data.reaction : "🔥";

    const payload = {
      id: randomUUID(),
      reaction: safeReaction,
      tableLabel: guestSession.table.label,
      guestName: guestSession.guestName || "Mesa",
      timestamp: Date.now(),
    };

    // Emitir ráfaga de reacción a la pantalla pública y demás oyentes
    realtimeBus.broadcast(guestSession.eventId, "REACTION_BURST", payload);

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
