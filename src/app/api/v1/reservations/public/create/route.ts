import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { handleApiError, BadRequestError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const createReservationSchema = z.object({
  venueId: z.string().min(1, "La sede es obligatoria"),
  tableId: z.string().optional(),
  packageId: z.string().optional(),
  decorationId: z.string().optional(),
  reservationDate: z.string().min(1, "La fecha de reserva es requerida"),
  customerName: z.string().min(2, "El nombre del titular es requerido"),
  customerPhone: z.string().min(6, "El WhatsApp de contacto es requerido"),
  customerEmail: z.string().email("Correo inválido").optional().or(z.literal("")),
  customerDoc: z.string().optional(),
  birthdayPersonName: z.string().optional(),
  birthdayPhotoUrl: z.string().optional(),
  specialNotes: z.string().optional(),
  paymentMethod: z.enum(["TRANSFER", "CASH_DOOR", "WHATSAPP"]).default("TRANSFER"),
  paymentProofUrl: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = createReservationSchema.parse(body);

    // 1. Verificar Venue
    const venue = await prisma.venue.findUnique({
      where: { id: data.venueId },
      include: {
        tenant: true,
        tables: { where: { active: true } },
      },
    });

    if (!venue) {
      throw new BadRequestError("Sede no encontrada");
    }

    // 2. Resolver Mesa
    let assignedTableId = data.tableId;
    if (!assignedTableId) {
      // Auto-asignar la primera mesa VIP o mesa disponible
      const vipTable =
        venue.tables.find((t) => t.zone === "VIP" || t.zone === "CAMAROTE") ||
        venue.tables[0];
      if (!vipTable) {
        throw new BadRequestError("No hay mesas disponibles en esta sede");
      }
      assignedTableId = vipTable.id;
    }

    // 3. Resolver Paquete y Decoración (si aplica)
    let pricingType = "CLEAN_FEE";
    let totalAmountCents = 0;
    let creditAmountCents = 0;
    let maxGuests = 6;
    let pkg = null;
    let deco = null;

    if (data.packageId) {
      pkg = await prisma.reservationPackage.findUnique({
        where: { id: data.packageId },
        include: { decorations: true },
      });

      if (!pkg || !pkg.active) {
        throw new BadRequestError("El paquete seleccionado no está disponible");
      }

      pricingType = pkg.pricingType;
      totalAmountCents = pkg.priceCents;
      creditAmountCents = pkg.creditAmountCents || 0;
      maxGuests = pkg.maxGuests;

      // Si seleccionó opción de decoración
      if (data.decorationId) {
        deco = pkg.decorations.find((d) => d.id === data.decorationId);
        if (deco && deco.extraPriceCents > 0) {
          totalAmountCents += deco.extraPriceCents;
        }
      }
    }

    // 4. Token de invitación único para compartir con amigos
    const inviteToken = `res_${Math.random().toString(36).substring(2, 7)}_${Date.now().toString(36)}`;

    // 5. Estado de pago
    const paymentStatus = data.paymentProofUrl ? "PENDING_REVIEW" : "PENDING";

    // 6. Parsear fecha
    const parsedDate = new Date(data.reservationDate);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestError("Fecha de reserva no válida");
    }

    // 7. Crear la reserva
    const reservation = await prisma.tableReservation.create({
      data: {
        tenantId: venue.tenantId,
        venueId: venue.id,
        tableId: assignedTableId,
        packageId: data.packageId || null,
        decorationId: data.decorationId || null,
        customerName: data.customerName.trim(),
        customerPhone: data.customerPhone.trim(),
        customerEmail: data.customerEmail ? data.customerEmail.trim() : null,
        customerDoc: data.customerDoc ? data.customerDoc.trim() : null,
        birthdayPersonName: data.birthdayPersonName ? data.birthdayPersonName.trim() : null,
        birthdayPhotoUrl: data.birthdayPhotoUrl || null,
        specialNotes: data.specialNotes || null,
        pricingType,
        totalAmountCents,
        creditAmountCents,
        creditRemainingCents: creditAmountCents,
        paymentMethod: data.paymentMethod,
        paymentStatus,
        paymentProofUrl: data.paymentProofUrl || null,
        reservationDate: parsedDate,
        inviteToken,
        maxGuests,
        status: "CONFIRMED",
      },
      include: {
        package: true,
        decoration: true,
        table: { select: { number: true, label: true, zone: true } },
        venue: { select: { name: true, whatsappNumber: true, bankName: true, bankAccount: true } },
      },
    });

    // 8. Crear pase automático QR para el cliente titular
    const mainGuestToken = `gst_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    await prisma.reservationGuest.create({
      data: {
        reservationId: reservation.id,
        guestName: reservation.customerName,
        guestPhone: reservation.customerPhone,
        guestDoc: reservation.customerDoc || null,
        qrToken: mainGuestToken,
      },
    });

    // 9. Notificar en tiempo real al panel del staff
    realtimeBus.emit("reservation:new", {
      reservationId: reservation.id,
      tenantId: venue.tenantId,
      customerName: reservation.customerName,
      tableNumber: reservation.table.number,
      totalAmountCents: reservation.totalAmountCents,
      isBirthday: !!reservation.birthdayPersonName,
      hasProof: !!reservation.paymentProofUrl,
    });

    return NextResponse.json({
      success: true,
      message: "Reserva registrada con éxito",
      reservation: {
        id: reservation.id,
        inviteToken: reservation.inviteToken,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        table: reservation.table,
        package: reservation.package
          ? {
              name: reservation.package.name,
              colorHex: reservation.package.colorHex,
              isBirthdayPackage: reservation.package.isBirthdayPackage,
            }
          : null,
        decoration: reservation.decoration
          ? {
              name: reservation.decoration.name,
              imageUrl: reservation.decoration.imageUrl,
              extraPriceCents: reservation.decoration.extraPriceCents,
            }
          : null,
        birthdayPersonName: reservation.birthdayPersonName,
        birthdayPhotoUrl: reservation.birthdayPhotoUrl,
        pricingType: reservation.pricingType,
        totalAmountCents: reservation.totalAmountCents,
        creditAmountCents: reservation.creditAmountCents,
        paymentMethod: reservation.paymentMethod,
        paymentStatus: reservation.paymentStatus,
        paymentProofUrl: reservation.paymentProofUrl,
        reservationDate: reservation.reservationDate.toISOString(),
        maxGuests: reservation.maxGuests,
        venue: reservation.venue,
        mainGuestToken,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
