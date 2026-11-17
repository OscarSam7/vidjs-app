import { NextRequest, NextResponse } from "next/server";
import { realtimeBus, RealtimeMessage } from "@/lib/realtime/event-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const qrToken = searchParams.get("qrToken")?.trim();
    const tenantId = searchParams.get("tenantId")?.trim();

    if (!qrToken && !tenantId) {
      return NextResponse.json(
        { success: false, error: "Se requiere 'qrToken' (cliente) o 'tenantId' (local) para suscribirse" },
        { status: 400 }
      );
    }

    const channelName = qrToken ? `beeper:ticket:${qrToken}` : `beeper:tenant:${tenantId}`;
    const encoder = new TextEncoder();

    let heartbeatTimer: NodeJS.Timeout | null = null;
    let listener: ((msg: RealtimeMessage) => void) | null = null;

    const stream = new ReadableStream({
      start(controller) {
        // Handshake inicial
        const initialHandshake: RealtimeMessage = {
          eventId: channelName,
          type: "CONNECTED",
          data: {
            status: "online",
            channel: channelName,
            serverTime: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        };

        controller.enqueue(
          encoder.encode(
            `event: ${initialHandshake.type}\ndata: ${JSON.stringify(initialHandshake.data)}\n\n`
          )
        );

        // Suscribir al bus de eventos
        listener = (msg: RealtimeMessage) => {
          try {
            const chunk = `event: ${msg.type}\ndata: ${JSON.stringify(msg.data)}\n\n`;
            controller.enqueue(encoder.encode(chunk));
          } catch (err) {
            console.error("Error transmitiendo SSE beeper:", err);
          }
        };

        realtimeBus.subscribe(channelName, listener);

        // Heartbeat cada 20s
        heartbeatTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`));
          } catch {
            if (heartbeatTimer) clearInterval(heartbeatTimer);
          }
        }, 20000);
      },
      cancel() {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        if (listener) {
          realtimeBus.unsubscribe(channelName, listener);
          listener = null;
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform, no-store",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error en canal SSE Beeper" },
      { status: 500 }
    );
  }
}
