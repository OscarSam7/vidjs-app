import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, BadRequestError, NotFoundError } from "@/lib/errors";

const claimPassSchema = z.object({
  guestName: z.string().min(2, "El nombre es obligatorio"),
  guestPhone: z.string().min(6, "El número de WhatsApp es obligatorio"),
  guestDoc: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const reservation = await prisma.tableReservation.findUnique({
      where: { inviteToken: token },
      include: {
        venue: { select: { id: true, name: true, whatsappNumber: true } },
        table: { select: { number: true, label: true, zone: true } },
        package: { select: { name: true, colorHex: true, isBirthdayPackage: true } },
        decoration: { select: { name: true, imageUrl: true } },
        guests: {
          select: { id: true, guestName: true, checkedIn: true, createdAt: true },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundError("Invitación no válida o expirada");
    }

    const claimedCount = reservation.guests.length;
    const remainingCount = Math.max(0, reservation.maxGuests - claimedCount);

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        customerName: reservation.customerName,
        birthdayPersonName: reservation.birthdayPersonName,
        birthdayPhotoUrl: reservation.birthdayPhotoUrl,
        reservationDate: reservation.reservationDate.toISOString(),
        venue: reservation.venue,
        table: reservation.table,
        package: reservation.package,
        decoration: reservation.decoration,
        maxGuests: reservation.maxGuests,
        claimedCount,
        remainingCount,
        guests: reservation.guests.map((g) => ({
          id: g.id,
          guestName: g.guestName,
          checkedIn: g.checkedIn,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const data = claimPassSchema.parse(body);

    const reservation = await prisma.tableReservation.findUnique({
      where: { inviteToken: token },
      include: { guests: true },
    });

    if (!reservation) {
      throw new NotFoundError("Invitación no válida");
    }

    if (reservation.status === "CANCELLED") {
      throw new BadRequestError("Esta reserva ha sido cancelada");
    }

    if (reservation.guests.length >= reservation.maxGuests) {
      throw new BadRequestError("Se ha alcanzado la capacidad máxima de pases para esta mesa");
    }

    // Comprobar si ya está registrado
    const existing = reservation.guests.find(
      (g) => g.guestPhone === data.guestPhone.trim() || g.guestName.toLowerCase() === data.guestName.trim().toLowerCase()
    );

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "Ya posees un pase registrado",
        guest: existing,
      });
    }

    // Crear nuevo pase individual
    const qrToken = `gst_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;

    const guest = await prisma.reservationGuest.create({
      data: {
        reservationId: reservation.id,
        guestName: data.guestName.trim(),
        guestPhone: data.guestPhone.trim(),
        guestDoc: data.guestDoc ? data.guestDoc.trim() : null,
        qrToken,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Pase VIP generado exitosamente",
      guest: {
        id: guest.id,
        guestName: guest.guestName,
        guestPhone: guest.guestPhone,
        qrToken: guest.qrToken,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
