import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getCurrentGuestSession } from "@/lib/auth/guest-session";
import { realtimeBus, RealtimeMessage } from "@/lib/realtime/event-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let eventId = searchParams.get("eventId")?.trim();
    const code = searchParams.get("code")?.trim().toUpperCase();

    // 1. Si se proporciona un código de evento/pantalla (ej: RETRO-POP), resolver el eventId
    if (!eventId && code) {
      const event = await prisma.event.findUnique({
        where: { code },
        select: { id: true, status: true },
      });
      if (event) {
        eventId = event.id;
      }
    }

    // 2. Si aún no hay eventId, intentar extraer de la cookie de sesión del comensal
    if (!eventId) {
      const guestSession = await getCurrentGuestSession();
      if (guestSession) {
        eventId = guestSession.eventId;
      }
    }

    if (!eventId) {
      return NextResponse.json(
        {
          error: {
            code: "BAD_REQUEST",
            message:
              "Se requiere 'eventId', 'code' o una sesión de mesa activa para suscribirse a eventos en tiempo real.",
          },
        },
        { status: 400 }
      );
    }

    // 3. Crear el flujo SSE usando ReadableStream nativo
    const encoder = new TextEncoder();
    const targetEventId = eventId;

    let heartbeatTimer: NodeJS.Timeout | null = null;
    let listener: ((msg: RealtimeMessage) => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Enviar mensaje inicial de confirmación de conexión
        const initialHandshake: RealtimeMessage = {
          eventId: targetEventId,
          type: "CONNECTED",
          data: {
            status: "online",
            serverTime: new Date().toISOString(),
            activeListeners: realtimeBus.getListenerCount(targetEventId) + 1,
          },
          timestamp: new Date().toISOString(),
        };

        controller.enqueue(
          encoder.encode(
            `event: ${initialHandshake.type}\ndata: ${JSON.stringify(
              initialHandshake.data
            )}\n\n`
          )
        );

        // Suscribirse a los eventos transmitidos en este evento
        listener = (msg: RealtimeMessage) => {
          try {
            const chunk = `event: ${msg.type}\ndata: ${JSON.stringify(
              msg.data
            )}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          } catch {
            // El stream podría haberse cerrado en el cliente
          }
        };

        realtimeBus.subscribe(targetEventId, listener);

        // Heartbeat para mantener viva la conexión a través de balanceadores y Smart TVs
        heartbeatTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: keep-alive\n\n`));
          } catch {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
          }
        }, 15000);
      },
      cancel() {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (listener) realtimeBus.unsubscribe(targetEventId, listener);
      },
    });

    // Manejar aborto desde la señal de la petición HTTP
    req.signal.addEventListener("abort", () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (listener) realtimeBus.unsubscribe(targetEventId, listener);
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: { code: "SERVER_ERROR", message: error.message } },
      { status: 500 }
    );
  }
}
