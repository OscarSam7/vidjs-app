import { prisma } from "@/lib/db/prisma";
import { realtimeBus } from "@/lib/realtime/event-bus";
import crypto from "crypto";

export interface BeeperPromoBanner {
  id: string;
  title: string;
  imageUrl?: string;
  linkUrl?: string;
  badge?: string;
  active: boolean;
}

export interface BeeperConfigData {
  id: string;
  tenantId: string;
  venueId?: string | null;
  enabled: boolean;
  defaultPrepMinutes: number;
  soundType: "CHIME" | "BELL" | "DIGITAL" | "VIBRANT";
  googleReviewUrl?: string | null;
  promoBanners: BeeperPromoBanner[];
  callTimeoutSeconds: number;
  autoVibrate: boolean;
  customWelcomeMsg?: string | null;
  customReadyMsg?: string | null;
}

/**
 * Obtener la configuración de llamadores virtuales del locatario
 */
export async function getBeeperConfig(tenantId: string, venueId?: string): Promise<BeeperConfigData> {
  let config = await prisma.beeperConfig.findUnique({
    where: { tenantId },
  }).catch(() => null);

  if (!config) {
    // Crear configuración por defecto si no existe
    const defaultBanners: BeeperPromoBanner[] = [
      {
        id: "promo-1",
        title: "¡2x1 en Cervezas y Tragos durante el Happy Hour!",
        badge: "PROMO HOY",
        linkUrl: "",
        active: true,
      },
      {
        id: "promo-2",
        title: "Pide el postre de la casa y llévate un café de cortesía",
        badge: "RECOMENDADO",
        linkUrl: "",
        active: true,
      },
    ];

    config = await prisma.beeperConfig.create({
      data: {
        tenantId,
        venueId: venueId || null,
        enabled: true,
        defaultPrepMinutes: 15,
        soundType: "CHIME",
        promoBannersJson: JSON.stringify(defaultBanners),
        callTimeoutSeconds: 120,
        autoVibrate: true,
        customWelcomeMsg: "Tu pedido está en cocina. Puedes esperar cómodamente en el salón.",
        customReadyMsg: "¡Tu pedido está listo! Por favor acércate al mostrador o barra a retirarlo.",
      },
    }).catch(() => null);
  }

  let promoBanners: BeeperPromoBanner[] = [];
  try {
    if (config?.promoBannersJson) {
      promoBanners = JSON.parse(config.promoBannersJson);
    }
  } catch {}

  return {
    id: config?.id || "default",
    tenantId,
    venueId: config?.venueId,
    enabled: config?.enabled ?? true,
    defaultPrepMinutes: config?.defaultPrepMinutes ?? 15,
    soundType: (config?.soundType as any) || "CHIME",
    googleReviewUrl: config?.googleReviewUrl,
    promoBanners,
    callTimeoutSeconds: config?.callTimeoutSeconds ?? 120,
    autoVibrate: config?.autoVibrate ?? true,
    customWelcomeMsg: config?.customWelcomeMsg,
    customReadyMsg: config?.customReadyMsg,
  };
}

/**
 * Actualizar configuración de llamadores virtuales
 */
export async function updateBeeperConfig(
  tenantId: string,
  data: Partial<BeeperConfigData>
) {
  const updatePayload: any = {};
  if (data.enabled !== undefined) updatePayload.enabled = data.enabled;
  if (data.defaultPrepMinutes !== undefined) updatePayload.defaultPrepMinutes = data.defaultPrepMinutes;
  if (data.soundType !== undefined) updatePayload.soundType = data.soundType;
  if (data.googleReviewUrl !== undefined) updatePayload.googleReviewUrl = data.googleReviewUrl;
  if (data.promoBanners !== undefined) updatePayload.promoBannersJson = JSON.stringify(data.promoBanners);
  if (data.callTimeoutSeconds !== undefined) updatePayload.callTimeoutSeconds = data.callTimeoutSeconds;
  if (data.autoVibrate !== undefined) updatePayload.autoVibrate = data.autoVibrate;
  if (data.customWelcomeMsg !== undefined) updatePayload.customWelcomeMsg = data.customWelcomeMsg;
  if (data.customReadyMsg !== undefined) updatePayload.customReadyMsg = data.customReadyMsg;

  const updated = await prisma.beeperConfig.upsert({
    where: { tenantId },
    create: {
      tenantId,
      ...updatePayload,
    },
    update: updatePayload,
  });

  // Notificar actualización de configuración en vivo
  realtimeBus.emit(`beeper:tenant:${tenantId}`, {
    eventId: `beeper:tenant:${tenantId}`,
    type: "BEEPER_CONFIG_UPDATED",
    data: updated,
    timestamp: new Date().toISOString(),
  });

  return updated;
}

/**
 * Generar siguiente código correlativo de llamador (ej: 101, 102...)
 */
export async function getNextShortCode(tenantId: string): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastTicket = await prisma.beeperTicket.findFirst({
    where: {
      tenantId,
      createdAt: { gte: today },
    },
    orderBy: { createdAt: "desc" },
    select: { shortCode: true },
  }).catch(() => null);

  if (!lastTicket || !lastTicket.shortCode) {
    return "101";
  }

  const num = parseInt(lastTicket.shortCode, 10);
  if (isNaN(num) || num >= 999) {
    return "101";
  }

  return String(num + 1);
}

/**
 * Crear un nuevo llamador virtual (Beeper Ticket)
 */
export async function createBeeperTicket({
  tenantId,
  venueId,
  customerName,
  customerPhone,
  tableOrOrderNumber,
  prepMinutes,
  shortCode,
}: {
  tenantId: string;
  venueId?: string | null;
  customerName?: string;
  customerPhone?: string;
  tableOrOrderNumber?: string;
  prepMinutes?: number;
  shortCode?: string;
}) {
  const config = await getBeeperConfig(tenantId, venueId || undefined);
  const minutes = prepMinutes || config.defaultPrepMinutes || 15;
  const code = shortCode?.trim() || (await getNextShortCode(tenantId));
  const qrToken = `bp_${crypto.randomBytes(12).toString("hex")}`;
  const estimatedReadyAt = new Date(Date.now() + minutes * 60 * 1000);

  const ticket = await prisma.beeperTicket.create({
    data: {
      tenantId,
      venueId: venueId || null,
      shortCode: code,
      qrToken,
      customerName: customerName?.trim() || null,
      customerPhone: customerPhone?.trim() || null,
      tableOrOrderNumber: tableOrOrderNumber?.trim() || null,
      status: "PREPARING",
      estimatedReadyAt,
    },
  });

  // Notificar al canal SSE del Tenant / Caja / Pantallas
  realtimeBus.emit(`beeper:tenant:${tenantId}`, {
    eventId: `beeper:tenant:${tenantId}`,
    type: "BEEPER_TICKET_CREATED",
    data: ticket,
    timestamp: new Date().toISOString(),
  });

  return ticket;
}

/**
 * Cambiar estado del ticket (Llamar, Re-llamar, Entregar, etc.)
 */
export async function handleTicketAction({
  tenantId,
  ticketId,
  action,
}: {
  tenantId: string;
  ticketId: string;
  action: "CALL" | "RING_AGAIN" | "DELIVER" | "ACKNOWLEDGE" | "EXPIRE";
}) {
  const existing = await prisma.beeperTicket.findFirst({
    where: { id: ticketId, tenantId },
  });

  if (!existing) {
    throw new Error("Llamador no encontrado");
  }

  const now = new Date();
  let updatedStatus = existing.status;
  const updateData: any = {};

  if (action === "CALL") {
    updatedStatus = "READY";
    updateData.status = "READY";
    updateData.readyAt = now;
    updateData.lastRingAt = now;
    updateData.ringCount = { increment: 1 };
  } else if (action === "RING_AGAIN") {
    updatedStatus = "READY";
    updateData.status = "READY";
    updateData.lastRingAt = now;
    updateData.ringCount = { increment: 1 };
  } else if (action === "DELIVER") {
    updatedStatus = "DELIVERED";
    updateData.status = "DELIVERED";
    updateData.deliveredAt = now;
  } else if (action === "ACKNOWLEDGE") {
    updatedStatus = "ACKNOWLEDGED";
    updateData.status = "ACKNOWLEDGED";
  } else if (action === "EXPIRE") {
    updatedStatus = "EXPIRED";
    updateData.status = "EXPIRED";
  }

  const updatedTicket = await prisma.beeperTicket.update({
    where: { id: ticketId },
    data: updateData,
  });

  const eventType =
    action === "CALL"
      ? "BEEPER_TICKET_READY"
      : action === "RING_AGAIN"
      ? "BEEPER_TICKET_RING_AGAIN"
      : action === "DELIVER"
      ? "BEEPER_TICKET_DELIVERED"
      : action === "ACKNOWLEDGE"
      ? "BEEPER_TICKET_ACKNOWLEDGED"
      : "BEEPER_TICKET_EXPIRED";

  const payload = {
    eventId: `beeper:ticket:${updatedTicket.qrToken}`,
    type: eventType as any,
    data: updatedTicket,
    timestamp: now.toISOString(),
  };

  // 1. Notificar al canal SSE individual del comensal
  realtimeBus.emit(`beeper:ticket:${updatedTicket.qrToken}`, payload);

  // 2. Notificar al canal SSE consolidado del local/cocina
  realtimeBus.emit(`beeper:tenant:${tenantId}`, {
    ...payload,
    eventId: `beeper:tenant:${tenantId}`,
  });

  return updatedTicket;
}

/**
 * Calificar experiencia del pedido
 */
export async function rateBeeperTicket({
  qrToken,
  rating,
  feedbackComment,
}: {
  qrToken: string;
  rating: number;
  feedbackComment?: string;
}) {
  const ticket = await prisma.beeperTicket.findUnique({
    where: { qrToken },
  });

  if (!ticket) {
    throw new Error("Llamador no encontrado");
  }

  const updated = await prisma.beeperTicket.update({
    where: { qrToken },
    data: {
      rating: Math.max(1, Math.min(5, rating)),
      feedbackComment: feedbackComment?.trim() || null,
    },
  });

  return updated;
}
