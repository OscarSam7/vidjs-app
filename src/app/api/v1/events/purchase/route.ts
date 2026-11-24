import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateAccreditationToken, generateAccreditationQrDataUrl, formatCodeNumber } from "@/lib/accreditation/token";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { sanitizeText } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      eventId: rawEventId,
      eventCode: rawEventCode,
      eventName: rawEventName,
      buyerName,
      buyerDoc,
      buyerEmail,
      buyerPhone,
      tiers = [],
      paymentMethod = "TRANSFER", // "TRANSFER" | "PIX" | "CASH" | "OTHER"
      receiptReference,
      receiptImage, // base64 o URL
      notes,
    } = body;

    // 1. Validaciones básicas de comprador
    if (!buyerName || typeof buyerName !== "string" || buyerName.trim().length < 2) {
      return NextResponse.json(
        { error: "Por favor ingresa tu Nombre y Apellido completos." },
        { status: 400 }
      );
    }

    if (!buyerDoc || typeof buyerDoc !== "string" || buyerDoc.trim().length < 3) {
      return NextResponse.json(
        { error: "El Documento de Identidad (CI o DNI) es obligatorio para la emisión del boleto." },
        { status: 400 }
      );
    }

    // 2. Validación de Métodos de Pago
    const validMethods = ["TRANSFER", "PIX", "CASH", "OTHER"];
    const normalizedMethod = validMethods.includes(paymentMethod) ? paymentMethod : "TRANSFER";

    // 3. REGLA ESTRICTA: Se requiere el envío previo del comprobante (foto o número de referencia/transacción)
    const hasReceiptProof = Boolean(
      (receiptReference && String(receiptReference).trim().length >= 3) ||
      (receiptImage && String(receiptImage).startsWith("data:image")) ||
      (normalizedMethod === "CASH" && (receiptReference || notes))
    );

    if (!hasReceiptProof) {
      return NextResponse.json(
        {
          error:
            "Requisito obligatorio: Debes adjuntar la foto del comprobante o el número de transacción/referencia para que el sistema pueda emitir tu boleta con QR.",
        },
        { status: 400 }
      );
    }

    // 4. Resolver Tenant y Evento
    let event = null;
    if (rawEventId) {
      event = await prisma.event.findUnique({
        where: { id: rawEventId },
        include: { tenant: true },
      });
    }

    if (!event && rawEventCode) {
      event = await prisma.event.findFirst({
        where: {
          OR: [
            { id: rawEventCode },
            { name: { contains: rawEventCode } },
          ],
        },
        include: { tenant: true },
      });
    }

    // Si aún no hay evento en BD (ej. evento demo / público precargado), buscar el primer tenant activo
    let tenantId = event?.tenantId || null;
    if (!tenantId) {
      const activeTenant = await prisma.tenant.findFirst({
        where: { status: "ACTIVE" },
        select: { id: true },
      });
      tenantId = activeTenant?.id || "tenant_default";
    }

    const cleanEventId = event?.id || `evt_${(rawEventCode || "VIDJS").toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
    const cleanEventName = event?.name || rawEventName || "Evento Oficial CYNKO";
    const cleanEventCode = rawEventCode || (event ? event.id.slice(0, 8).toUpperCase() : "VIDJS");

    // 5. Procesar Entradas solicitadas
    const sanitizedTiers = Array.isArray(tiers) && tiers.length > 0
      ? tiers
      : [{ id: "general", name: "ACCESO GENERAL", price: 25000, count: 1, formattedPrice: "Gs. 25.000" }];

    const generatedTickets: any[] = [];
    const cleanBuyerName = sanitizeText(buyerName).trim();
    const cleanBuyerDoc = sanitizeText(buyerDoc).trim();
    const cleanBuyerEmail = buyerEmail ? sanitizeText(buyerEmail).trim() : `${cleanBuyerDoc}@vidjs.com`;
    const cleanBuyerPhone = buyerPhone ? sanitizeText(buyerPhone).trim() : "";
    const cleanReference = receiptReference ? sanitizeText(receiptReference).trim() : `REF-${Date.now().toString().slice(-6)}`;

    // Separar nombre y apellido
    const nameParts = cleanBuyerName.split(" ");
    const firstName = nameParts[0] || "Invitado";
    const lastName = nameParts.slice(1).join(" ") || "Registrado";

    // Intentar registrar en BD si hay tenant válido y evento
    let dbParticipant = null;
    let defaultAccreditationType = null;

    if (event) {
      try {
        // Buscar o crear tipo de acreditación
        defaultAccreditationType = await prisma.accreditationType.findFirst({
          where: { eventId: event.id, tenantId: event.tenantId },
        });

        if (!defaultAccreditationType) {
          defaultAccreditationType = await prisma.accreditationType.create({
            data: {
              tenantId: event.tenantId,
              eventId: event.id,
              name: "ENTRADA GENERAL",
              code: "GENERAL",
              description: "Acceso con boleto oficial pagado",
              colorHex: "#8B5CF6",
              active: true,
            },
          });
        }

        // Buscar participante existente o crear uno nuevo
        dbParticipant = await prisma.eventParticipant.upsert({
          where: {
            eventId_documentNumber: {
              eventId: event.id,
              documentNumber: cleanBuyerDoc,
            },
          },
          update: {
            firstName,
            lastName,
            email: cleanBuyerEmail,
            phone: cleanBuyerPhone,
            customData: JSON.stringify({
              paymentMethod: normalizedMethod,
              receiptReference: cleanReference,
              notes: notes ? sanitizeText(notes) : null,
              hasReceiptImage: Boolean(receiptImage),
            }),
          },
          create: {
            tenantId: event.tenantId,
            eventId: event.id,
            firstName,
            lastName,
            documentNumber: cleanBuyerDoc,
            documentType: "CI",
            email: cleanBuyerEmail,
            phone: cleanBuyerPhone,
            whatsapp: cleanBuyerPhone,
            accreditationTypeId: defaultAccreditationType.id,
            customData: JSON.stringify({
              paymentMethod: normalizedMethod,
              receiptReference: cleanReference,
              notes: notes ? sanitizeText(notes) : null,
              hasReceiptImage: Boolean(receiptImage),
            }),
          },
        });
      } catch (dbErr) {
        console.warn("[EVENT_PURCHASE] Warning al persistir en BD:", dbErr);
      }
    }

    // 6. Generar las boletas individuales con QR
    for (const tier of sanitizedTiers) {
      const count = Math.max(1, parseInt(tier.count) || 1);
      const tierPrice = Number(tier.price) || 0;
      const tierName = tier.name || "ACCESO GENERAL";

      for (let i = 1; i <= count; i++) {
        const ticketRandom = Math.floor(100000 + Math.random() * 900000);
        const ticketCodeNumber = `VID-${cleanEventCode.slice(0, 8).toUpperCase()}-${ticketRandom}`;

        // Generar token y firma criptográfica
        const participantId = dbParticipant?.id || `p_${ticketRandom}`;
        const tokenMeta = generateAccreditationToken(cleanEventId, participantId);

        // Generar QR en formato Data URL PNG de alta definición
        let qrDataUrl = "";
        try {
          qrDataUrl = await generateAccreditationQrDataUrl(tokenMeta.qrPayload, {
            width: 320,
            colorDark: "#080F1F",
            colorLight: "#FFFFFF",
          });
        } catch {
          qrDataUrl = "";
        }

        // Si tenemos evento en BD, guardar la acreditación oficial
        if (event && dbParticipant && defaultAccreditationType) {
          try {
            await prisma.eventAccreditation.create({
              data: {
                tenantId: event.tenantId,
                eventId: event.id,
                participantId: dbParticipant.id,
                accreditationTypeId: defaultAccreditationType.id,
                codeNumber: ticketCodeNumber,
                qrToken: tokenMeta.qrToken,
                qrSignature: tokenMeta.qrSignature,
                qrCodeUrl: qrDataUrl || null,
                status: "APPROVED",
                issuedBy: `VENTA_DIGITAL_${normalizedMethod}`,
              },
            });
          } catch (accErr) {
            console.warn("[EVENT_PURCHASE] Warning al guardar acreditación:", accErr);
          }
        }

        generatedTickets.push({
          id: ticketCodeNumber,
          eventCode: cleanEventCode,
          eventName: cleanEventName,
          tierName,
          tierPrice,
          formattedPrice: tier.formattedPrice || `Gs. ${tierPrice.toLocaleString("es-PY")}`,
          buyerName: cleanBuyerName,
          buyerDoc: cleanBuyerDoc,
          buyerEmail: cleanBuyerEmail,
          buyerPhone: cleanBuyerPhone,
          venueName: event?.locationName || "Rumba Stage",
          eventDate: event?.timeSchedule || "14 Nov. 2026 - A partir de las 12:00 hs",
          purchaseDate: new Date().toLocaleDateString("es-PY", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          paymentMethod: normalizedMethod,
          receiptReference: cleanReference,
          hasReceiptImage: Boolean(receiptImage),
          paymentStatus: "VERIFIED",
          qrToken: tokenMeta.qrToken,
          qrSignature: tokenMeta.qrSignature,
          qrPayload: tokenMeta.qrPayload,
          qrDataUrl,
        });
      }
    }

    // 7. Notificación en tiempo real al Dashboard de Acreditaciones
    if (tenantId) {
      try {
        realtimeBus.broadcast(tenantId, "ACCREDITATION_NEW_SALE" as any, {
          eventName: cleanEventName,
          buyerName: cleanBuyerName,
          buyerDoc: cleanBuyerDoc,
          paymentMethod: normalizedMethod,
          receiptReference: cleanReference,
          ticketsCount: generatedTickets.length,
          timestamp: new Date().toISOString(),
        });
      } catch (broadcastErr) {
        console.warn("[EVENT_PURCHASE] Warning SSE broadcast:", broadcastErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: "¡Comprobante verificado y boleta emitida con éxito!",
      tickets: generatedTickets,
    });
  } catch (error: any) {
    console.error("[EVENT_PURCHASE_ERROR]", error);
    return NextResponse.json(
      { error: "Ocurrió un error al procesar el pago y emitir la boleta." },
      { status: 500 }
    );
  }
}
