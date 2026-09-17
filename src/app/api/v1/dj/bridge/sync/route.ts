import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, NotFoundError, UnauthorizedError } from "@/lib/errors";

const bridgeSyncSchema = z.object({
  eventCode: z.string().min(1),
  token: z.string().min(1),
  action: z.enum(["TRACK_PLAYING", "TRACK_COMPLETED", "HEARTBEAT"]),
  trackTitle: z.string().optional(),
  artistName: z.string().optional(),
  bpm: z.number().optional(),
  queueEntryId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = bridgeSyncSchema.parse(body);

    // 1. Buscar evento y validar token
    const event = await prisma.event.findUnique({
      where: { code: data.eventCode.toUpperCase() },
    });

    if (!event) {
      throw new NotFoundError("Evento no encontrado");
    }

    const expectedToken = `br_${event.code.toLowerCase()}_${event.pin || "live"}`;
    if (data.token !== expectedToken) {
      throw new UnauthorizedError("Token de DJ Bridge inválido");
    }

    // 2. Acción: HEARTBEAT (comprobación de conexión)
    if (data.action === "HEARTBEAT") {
      return NextResponse.json({
        success: true,
        message: "DJ Bridge conectado y activo",
        serverTime: new Date().toISOString(),
      });
    }

    // 3. Acción: TRACK_PLAYING (el software de DJ cargó un tema en su bandeja física)
    if (data.action === "TRACK_PLAYING") {
      const now = new Date();

      // Si se envió un queueEntryId específico, usar ese
      if (data.queueEntryId) {
        await prisma.$transaction([
          // Finalizar anterior
          prisma.queueEntry.updateMany({
            where: { eventId: event.id, status: "CURRENT", id: { not: data.queueEntryId } },
            data: { status: "COMPLETED" },
          }),
          prisma.songRequest.updateMany({
            where: { eventId: event.id, status: "PLAYING" },
            data: { status: "PLAYED", playedAt: now },
          }),
          // Activar nuevo
          prisma.queueEntry.update({
            where: { id: data.queueEntryId },
            data: { status: "CURRENT" },
          }),
        ]);
      } else if (data.trackTitle) {
        // Buscar coincidencia en la cola por título
        const match = await prisma.queueEntry.findFirst({
          where: {
            eventId: event.id,
            status: "QUEUED",
            songRequest: {
              OR: [
                { customTitle: { contains: data.trackTitle } },
                { song: { title: { contains: data.trackTitle } } },
              ],
            },
          },
          include: { songRequest: true },
        });

        if (match) {
          await prisma.$transaction([
            prisma.queueEntry.updateMany({
              where: { eventId: event.id, status: "CURRENT" },
              data: { status: "COMPLETED" },
            }),
            prisma.songRequest.updateMany({
              where: { eventId: event.id, status: "PLAYING" },
              data: { status: "PLAYED", playedAt: now },
            }),
            prisma.queueEntry.update({
              where: { id: match.id },
              data: { status: "CURRENT" },
            }),
            prisma.songRequest.update({
              where: { id: match.songRequestId },
              data: { status: "PLAYING", playedAt: now },
            }),
          ]);
        }
      }

      // Consultar tema activo actual
      const currentEntry = await prisma.queueEntry.findFirst({
        where: { eventId: event.id, status: "CURRENT" },
        include: {
          songRequest: {
            include: {
              song: { include: { artist: true } },
              table: true,
            },
          },
        },
      });

      return NextResponse.json({
        success: true,
        message: "Tema sincronizado con éxito desde el software de DJ",
        data: {
          track: currentEntry
            ? {
                id: currentEntry.id,
                title:
                  currentEntry.songRequest.song?.title ||
                  currentEntry.songRequest.customTitle ||
                  "Canción",
                artist:
                  currentEntry.songRequest.song?.artist?.name ||
                  currentEntry.songRequest.customArtist ||
                  "Artista",
                table: currentEntry.songRequest.table.label,
              }
            : null,
        },
      });
    }

    // 4. Acción: TRACK_COMPLETED
    if (data.action === "TRACK_COMPLETED") {
      await prisma.$transaction([
        prisma.queueEntry.updateMany({
          where: { eventId: event.id, status: "CURRENT" },
          data: { status: "COMPLETED" },
        }),
        prisma.songRequest.updateMany({
          where: { eventId: event.id, status: "PLAYING" },
          data: { status: "PLAYED", playedAt: new Date() },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Tema marcado como completado",
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
