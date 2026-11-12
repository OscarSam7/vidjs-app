import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { PERMISSIONS, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";
import { generateQrDataUrl } from "@/lib/qr/generator";
import { getRequestOrigin } from "@/lib/url";
import { ensureGastronomySeeded } from "@/lib/gastronomy/seed-defaults";

// Cache en memoria para URLs de QR data URL para evitar saturación de CPU y canvas
const qrCache = new Map<string, string>();

async function getCachedQrDataUrl(url: string): Promise<string> {
  const cached = qrCache.get(url);
  if (cached) return cached;
  try {
    const data = await generateQrDataUrl(url);
    qrCache.set(url, data);
    return data;
  } catch (err) {
    console.error("Error generating QR data URL:", err);
    return "";
  }
}

const tableOperationSchema = z.object({
  action: z.enum([
    "CREATE_SECTOR",
    "EDIT_SECTOR",
    "DELETE_SECTOR",
    "CREATE_TABLE",
    "EDIT_TABLE",
    "DELETE_TABLE",
    "REGENERATE_QR",
    "UPDATE_TABLE_STATUS",
    "UPDATE_TABLE_POSITION",
    "TRANSFER_TABLE_SESSION",
    "MERGE_TABLE_SESSIONS",
    "SPLIT_TABLE_SESSION",
    "CLOSE_TABLE_SESSION",
  ]),
  venueId: z.string().optional(),
  // Para sector
  sectorId: z.string().optional(),
  sectorName: z.string().optional(),
  sectorCode: z.string().optional(),
  colorHex: z.string().optional(),
  // Para mesa
  tableId: z.string().optional(),
  number: z.coerce.number().int().optional(),
  label: z.string().optional(),
  capacity: z.coerce.number().int().optional(),
  zone: z.string().optional(),
  active: z.boolean().optional(),
  regenerateQr: z.boolean().optional(),
  tableStatus: z
    .enum(["AVAILABLE", "OCCUPIED", "RESERVED", "PENDING_PAYMENT", "CLEANING", "BLOCKED"])
    .optional(),
  posX: z.coerce.number().int().optional(),
  posY: z.coerce.number().int().optional(),
  customerName: z.string().optional(),
  // Para transferencia / unificación / división
  sourceTableId: z.string().optional(),
  targetTableId: z.string().optional(),
  splitParts: z.coerce.number().int().min(2).max(20).optional(),
  splitNames: z.array(z.string()).optional(),
  reason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    await ensureGastronomySeeded(tenantId);
    const origin = getRequestOrigin(req);

    const [sectors, tables, activeEvent] = await Promise.all([
      prisma.gastroSector.findMany({
        where: { tenantId, active: true },
        orderBy: { orderIndex: "asc" },
      }),
      prisma.table.findMany({
        where: { tenantId, active: true },
        include: {
          venue: { select: { id: true, name: true } },
          sector: { select: { id: true, name: true, code: true, colorHex: true } },
          gastroOrders: {
            where: { status: { not: "CANCELLED" } },
            include: { items: true },
            orderBy: { receivedAt: "desc" },
            take: 10,
          },
          gastroTableSessions: {
            where: { status: { in: ["OPEN", "PENDING_PAYMENT"] } },
            include: {
              orders: {
                where: { status: { not: "CANCELLED" } },
                include: { items: true },
              },
            },
            orderBy: { openedAt: "desc" },
            take: 1,
          },
        },
        orderBy: { number: "asc" },
      }),
      prisma.event.findFirst({
        where: { tenantId, status: "ACTIVE" },
        select: { id: true, name: true, code: true, venueId: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const defaultSector = sectors[0] || null;

    const enrichedTables = await Promise.all(
      tables.map(async (t) => {
        // Si alguna mesa existente no tenía sectorId asignado, vincularla automáticamente al sector principal
        let effectiveSector = t.sector;
        let effectiveSectorId = t.sectorId;
        if (!effectiveSectorId && defaultSector) {
          effectiveSectorId = defaultSector.id;
          effectiveSector = {
            id: defaultSector.id,
            name: defaultSector.name,
            code: defaultSector.code,
            colorHex: defaultSector.colorHex,
          };
          await prisma.table
            .update({
              where: { id: t.id },
              data: { sectorId: defaultSector.id },
            })
            .catch(() => null);
        }

        const scanUrl = `${origin}/qr/${t.qrToken}`;
        const menuUrl = `${origin}/menu?qrToken=${t.qrToken}`;
        const qrDataUrl = await getCachedQrDataUrl(scanUrl);
        const menuQrDataUrl = await getCachedQrDataUrl(menuUrl);
        const activeOrders = (t.gastroOrders || []).filter(
          (o) => o.status !== "DELIVERED" || o.paymentStatus === "PENDING"
        );
        return {
          ...t,
          sectorId: effectiveSectorId,
          sector: effectiveSector,
          scanUrl,
          menuUrl,
          qrDataUrl,
          menuQrDataUrl,
          activeSession: t.gastroTableSessions[0] || null,
          activeOrders,
        };
      })
    );

    return NextResponse.json({
      success: true,
      sectors,
      tables: enrichedTables,
      activeEvent,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    const canManageTables = hasAnyPermission(session.role, [
      PERMISSIONS.GASTRO_TABLES_MANAGE,
      PERMISSIONS.TABLES_MANAGE,
      PERMISSIONS.GASTRO_CASHIER_OPERATE,
    ]);

    if (!canManageTables) {
      throw new ForbiddenError("No tienes permisos para administrar mesas, sectores o cuentas");
    }

    const body = await req.json();
    const data = tableOperationSchema.parse(body);

    let targetVenueId = data.venueId;
    if (!targetVenueId) {
      const firstVenue = await prisma.venue.findFirst({ where: { tenantId, active: true } });
      targetVenueId = firstVenue?.id;
    }
    if (!targetVenueId) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No se encontró sede activa" } },
        { status: 404 }
      );
    }

    // 1. CREAR SECTOR (Fase 9)
    if (data.action === "CREATE_SECTOR") {
      if (!data.sectorName) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "El nombre del sector es obligatorio" } },
          { status: 400 }
        );
      }
      const code =
        data.sectorCode?.toUpperCase() ||
        data.sectorName
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .slice(0, 16);

      const countSectors = await prisma.gastroSector.count({ where: { tenantId } });
      const sector = await prisma.gastroSector.create({
        data: {
          tenantId,
          venueId: targetVenueId,
          name: data.sectorName,
          code: `${code}_${countSectors + 1}`,
          colorHex: data.colorHex || "#8B5CF6",
          orderIndex: countSectors + 1,
          active: true,
        },
      });

      realtimeBus.broadcast("global", "GASTRO_TABLE_SESSION_UPDATED", {
        action: "SECTOR_CREATED",
        sectorId: sector.id,
      });

      return NextResponse.json({ success: true, sector });
    }

    // 1B. EDITAR SECTOR Y SINCRONIZAR PEDIDOS ASOCIADOS
    if (data.action === "EDIT_SECTOR" && data.sectorId && data.sectorName) {
      const updatedSector = await prisma.gastroSector.update({
        where: { id: data.sectorId },
        data: {
          name: data.sectorName.trim(),
          ...(data.colorHex ? { colorHex: data.colorHex } : {}),
        },
      });

      const sectorTables = await prisma.table.findMany({
        where: { tenantId, sectorId: updatedSector.id },
        select: { id: true },
      });
      if (sectorTables.length > 0) {
        await prisma.gastroOrder.updateMany({
          where: { tableId: { in: sectorTables.map((t) => t.id) } },
          data: { sectorName: updatedSector.name },
        });
      }

      realtimeBus.broadcast("global", "GASTRO_TABLE_SESSION_UPDATED", {
        action: "SECTOR_UPDATED",
        sectorId: updatedSector.id,
      });

      return NextResponse.json({ success: true, sector: updatedSector });
    }

    // 1C. ELIMINAR SECTOR (REASIGNANDO MESAS AL SECTOR PRINCIPAL)
    if (data.action === "DELETE_SECTOR" && data.sectorId) {
      const fallbackSector = await prisma.gastroSector.findFirst({
        where: { tenantId, id: { not: data.sectorId }, active: true },
        orderBy: { orderIndex: "asc" },
      });

      if (fallbackSector) {
        await prisma.table.updateMany({
          where: { tenantId, sectorId: data.sectorId },
          data: { sectorId: fallbackSector.id },
        });
      }

      await prisma.gastroSector.delete({ where: { id: data.sectorId } }).catch(async () => {
        await prisma.gastroSector.update({
          where: { id: data.sectorId },
          data: { active: false },
        });
      });

      realtimeBus.broadcast("global", "GASTRO_TABLE_SESSION_UPDATED", {
        action: "SECTOR_DELETED",
        sectorId: data.sectorId,
      });

      return NextResponse.json({ success: true });
    }

    // 2. CREAR MESA CON SECTOR (Fase 9)
    if (data.action === "CREATE_TABLE") {
      const countTables = await prisma.table.count({ where: { tenantId, active: true } });
      const nextNum = data.number || countTables + 1;
      const qrToken = `qr_gastro_m${nextNum}_${Math.random().toString(36).slice(2, 8)}`;

      const created = await prisma.table.create({
        data: {
          tenantId,
          venueId: targetVenueId,
          number: nextNum,
          label: data.label || `Mesa ${nextNum}`,
          capacity: data.capacity || 4,
          sectorId: data.sectorId || null,
          zone: data.zone || "DJ",
          tableStatus: "AVAILABLE",
          qrToken,
          posX: data.posX ?? (countTables % 4) * 220 + 40,
          posY: data.posY ?? Math.floor(countTables / 4) * 160 + 40,
          active: true,
        },
        include: {
          sector: { select: { id: true, name: true, code: true, colorHex: true } },
        },
      });

      realtimeBus.broadcast("global", "GASTRO_TABLE_SESSION_UPDATED", {
        action: "TABLE_CREATED",
        tableId: created.id,
      });

      return NextResponse.json({ success: true, table: created });
    }

    // 2B. EDITAR MESA UNIFICADA (Nombre, Número, Capacidad, Sector y Regeneración de QR)
    if (data.action === "EDIT_TABLE" && data.tableId) {
      const existing = await prisma.table.findFirst({ where: { id: data.tableId, tenantId } });
      if (!existing) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Mesa no encontrada" } },
          { status: 404 }
        );
      }

      const newQrToken = data.regenerateQr
        ? `qr_gastro_m${data.number || existing.number}_${Math.random().toString(36).slice(2, 8)}`
        : existing.qrToken;

      const updated = await prisma.table.update({
        where: { id: existing.id },
        data: {
          ...(data.number !== undefined ? { number: data.number } : {}),
          ...(data.label !== undefined ? { label: data.label } : {}),
          ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
          ...(data.sectorId !== undefined ? { sectorId: data.sectorId } : {}),
          ...(data.zone !== undefined ? { zone: data.zone } : {}),
          ...(data.active !== undefined ? { active: data.active } : {}),
          qrToken: newQrToken,
        },
        include: {
          sector: { select: { id: true, name: true, code: true, colorHex: true } },
        },
      });

      // Sincronizar nombre de mesa, número y sector en todos los pedidos asociados a esta mesa
      await prisma.gastroOrder.updateMany({
        where: { tableId: updated.id },
        data: {
          tableLabel: updated.label,
          tableNumber: updated.number,
          sectorName: updated.sector?.name || "Salón principal",
        },
      });

      realtimeBus.broadcast("global", "GASTRO_TABLE_SESSION_UPDATED", {
        action: "TABLE_UPDATED",
        tableId: updated.id,
      });

      return NextResponse.json({ success: true, table: updated });
    }

    // 2C. REGENERAR TOKEN QR DE LA MESA
    if (data.action === "REGENERATE_QR" && data.tableId) {
      const existing = await prisma.table.findFirst({ where: { id: data.tableId, tenantId } });
      if (!existing) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Mesa no encontrada" } },
          { status: 404 }
        );
      }
      const newQrToken = `qr_gastro_m${existing.number}_${Math.random().toString(36).slice(2, 8)}`;
      const updated = await prisma.table.update({
        where: { id: existing.id },
        data: { qrToken: newQrToken },
      });
      return NextResponse.json({ success: true, table: updated });
    }

    // 2D. ELIMINAR MESA (O desactivar si posee historial)
    if (data.action === "DELETE_TABLE" && data.tableId) {
      const existing = await prisma.table.findFirst({ where: { id: data.tableId, tenantId } });
      if (!existing) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Mesa no encontrada" } },
          { status: 404 }
        );
      }
      try {
        await prisma.table.delete({ where: { id: existing.id } });
        return NextResponse.json({ success: true, deleted: true });
      } catch {
        // Si tiene pedidos/solicitudes históricas, se desactiva preservando trazabilidad
        const deactivated = await prisma.table.update({
          where: { id: existing.id },
          data: { active: false, tableStatus: "BLOCKED" },
        });
        return NextResponse.json({ success: true, deleted: false, table: deactivated });
      }
    }

    // 3. CAMBIAR ESTADO DE MESA (Disponible, Ocupada, Reservada, Pendiente de pago, En limpieza, Bloqueada)
    if (data.action === "UPDATE_TABLE_STATUS" && data.tableId && data.tableStatus) {
      const updated = await prisma.table.update({
        where: { id: data.tableId },
        data: { tableStatus: data.tableStatus },
      });

      realtimeBus.broadcast("global", "GASTRO_TABLE_SESSION_UPDATED", {
        tableId: updated.id,
        tableStatus: updated.tableStatus,
      });

      return NextResponse.json({ success: true, table: updated });
    }

    // 4. ACTUALIZAR COORDENADAS DEL PLANO VISUAL
    if (data.action === "UPDATE_TABLE_POSITION" && data.tableId) {
      const updated = await prisma.table.update({
        where: { id: data.tableId },
        data: {
          ...(data.posX !== undefined ? { posX: data.posX } : {}),
          ...(data.posY !== undefined ? { posY: data.posY } : {}),
          ...(data.sectorId !== undefined ? { sectorId: data.sectorId } : {}),
        },
      });
      return NextResponse.json({ success: true, table: updated });
    }

    // 5. TRANSFERIR PEDIDOS ENTRE MESAS CON AUTORIZACIÓN Y REGISTRO (Fase 9)
    if (data.action === "TRANSFER_TABLE_SESSION" && data.sourceTableId && data.targetTableId) {
      if (data.sourceTableId === data.targetTableId) {
        return NextResponse.json(
          { error: { code: "BAD_REQUEST", message: "La mesa origen y destino deben ser distintas" } },
          { status: 400 }
        );
      }

      const [sourceTable, targetTable] = await Promise.all([
        prisma.table.findFirst({
          where: { id: data.sourceTableId, tenantId },
          include: { sector: true },
        }),
        prisma.table.findFirst({
          where: { id: data.targetTableId, tenantId },
          include: { sector: true },
        }),
      ]);

      if (!sourceTable || !targetTable) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Mesa origen o destino no encontrada" } },
          { status: 404 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const sourceSession = await tx.gastroTableSession.findFirst({
          where: { tenantId, tableId: sourceTable.id, status: { in: ["OPEN", "PENDING_PAYMENT"] } },
          orderBy: { openedAt: "desc" },
        });

        // Mover todos los pedidos activos de la mesa origen a la mesa destino
        const movedOrders = await tx.gastroOrder.updateMany({
          where: {
            tenantId,
            tableId: sourceTable.id,
            status: { notIn: ["DELIVERED", "CANCELLED"] },
          },
          data: {
            tableId: targetTable.id,
            tableNumber: targetTable.number,
            tableLabel: targetTable.label,
            sectorName: targetTable.sector?.name || targetTable.zone || "Salón Principal",
          },
        });

        if (sourceSession) {
          await tx.gastroTableSession.update({
            where: { id: sourceSession.id },
            data: {
              tableId: targetTable.id,
              notes: `Transferida desde ${sourceTable.label} a ${targetTable.label} por ${session.name}`,
            },
          });

          // Mover también todos los pedidos de esa sesión (incluidos entregados de la cuenta actual)
          await tx.gastroOrder.updateMany({
            where: { tableSessionId: sourceSession.id },
            data: {
              tableId: targetTable.id,
              tableNumber: targetTable.number,
              tableLabel: targetTable.label,
              sectorName: targetTable.sector?.name || targetTable.zone || "Salón Principal",
            },
          });
        }

        await tx.table.update({
          where: { id: sourceTable.id },
          data: { tableStatus: "AVAILABLE" },
        });

        await tx.table.update({
          where: { id: targetTable.id },
          data: { tableStatus: "OCCUPIED" },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: "GASTRO_TABLE_TRANSFERRED",
            resource: "GASTRO_TABLE",
            resourceId: targetTable.id,
            metadata: JSON.stringify({
              fromTable: sourceTable.label,
              toTable: targetTable.label,
              movedOrdersCount: movedOrders.count,
              authorizedBy: session.name,
              reason: data.reason || "Cambio de mesa solicitado por cliente",
            }),
          },
        });

        return { from: sourceTable.label, to: targetTable.label };
      });

      realtimeBus.broadcast("global", "GASTRO_TABLE_SESSION_UPDATED", {
        action: "TRANSFERRED",
        from: result.from,
        to: result.to,
      });

      return NextResponse.json({ success: true, transfer: result });
    }

    // 6. UNIFICAR CUENTAS ENTRE DOS MESAS (Fase 9)
    if (data.action === "MERGE_TABLE_SESSIONS" && data.sourceTableId && data.targetTableId) {
      const [sourceTable, targetTable] = await Promise.all([
        prisma.table.findFirst({ where: { id: data.sourceTableId, tenantId }, include: { sector: true } }),
        prisma.table.findFirst({ where: { id: data.targetTableId, tenantId }, include: { sector: true } }),
      ]);

      if (!sourceTable || !targetTable) {
        return NextResponse.json(
          { error: { code: "NOT_FOUND", message: "Mesa origen o destino no encontrada" } },
          { status: 404 }
        );
      }

      const merged = await prisma.$transaction(async (tx) => {
        const sourceSession = await tx.gastroTableSession.findFirst({
          where: { tenantId, tableId: sourceTable.id, status: { in: ["OPEN", "PENDING_PAYMENT"] } },
        });
        let targetSession = await tx.gastroTableSession.findFirst({
          where: { tenantId, tableId: targetTable.id, status: { in: ["OPEN", "PENDING_PAYMENT"] } },
        });

        if (!targetSession) {
          targetSession = await tx.gastroTableSession.create({
            data: {
              tenantId,
              venueId: targetTable.venueId,
              tableId: targetTable.id,
              sessionCode: `SES-UNI-${targetTable.number}-${Date.now().toString(36).slice(-4).toUpperCase()}`,
              status: "OPEN",
              customerName: sourceSession?.customerName || "Cuenta Unificada",
            },
          });
        }

        if (sourceSession) {
          // Reasignar pedidos y pagos de la sesión origen a la sesión destino
          await tx.gastroOrder.updateMany({
            where: { tableSessionId: sourceSession.id },
            data: {
              tableSessionId: targetSession.id,
              tableId: targetTable.id,
              tableNumber: targetTable.number,
              tableLabel: targetTable.label,
              sectorName: targetTable.sector?.name || targetTable.zone || "Salón Principal",
            },
          });

          await tx.gastroPayment.updateMany({
            where: { tableSessionId: sourceSession.id },
            data: { tableSessionId: targetSession.id },
          });

          targetSession = await tx.gastroTableSession.update({
            where: { id: targetSession.id },
            data: {
              subtotalCents: targetSession.subtotalCents + sourceSession.subtotalCents,
              discountCents: targetSession.discountCents + sourceSession.discountCents,
              serviceFeeCents: targetSession.serviceFeeCents + sourceSession.serviceFeeCents,
              depositAppliedCents:
                targetSession.depositAppliedCents + sourceSession.depositAppliedCents,
              totalCents: targetSession.totalCents + sourceSession.totalCents,
              paidCents: targetSession.paidCents + sourceSession.paidCents,
              balanceCents: targetSession.balanceCents + sourceSession.balanceCents,
              notes: `Unificada con ${sourceTable.label} por ${session.name}`,
            },
          });

          await tx.gastroTableSession.update({
            where: { id: sourceSession.id },
            data: {
              status: "MERGED",
              closedAt: new Date(),
              notes: `Unificada hacia ${targetTable.label}`,
            },
          });
        }

        await tx.table.update({
          where: { id: sourceTable.id },
          data: { tableStatus: "AVAILABLE" },
        });
        await tx.table.update({
          where: { id: targetTable.id },
          data: { tableStatus: "OCCUPIED" },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: "GASTRO_ACCOUNTS_MERGED",
            resource: "GASTRO_TABLE_SESSION",
            resourceId: targetSession.id,
            metadata: JSON.stringify({
              sourceTable: sourceTable.label,
              targetTable: targetTable.label,
              mergedTotalCents: targetSession.totalCents,
              authorizedBy: session.name,
            }),
          },
        });

        return targetSession;
      });

      realtimeBus.broadcast("global", "GASTRO_TABLE_SESSION_UPDATED", {
        action: "MERGED",
        targetSessionId: merged.id,
      });

      return NextResponse.json({ success: true, mergedSession: merged });
    }

    // 7. DIVIDIR CUENTA ENTRE VARIOS CLIENTES (Fase 9 y 19)
    if (data.action === "SPLIT_TABLE_SESSION" && data.tableId) {
      const parts = data.splitParts || 2;
      const openSession = await prisma.gastroTableSession.findFirst({
        where: { tenantId, tableId: data.tableId, status: { in: ["OPEN", "PENDING_PAYMENT"] } },
        include: { orders: { where: { status: { not: "CANCELLED" } } } },
      });

      const totalToSplit =
        openSession?.totalCents ||
        (
          await prisma.gastroOrder.findMany({
            where: { tenantId, tableId: data.tableId, status: { not: "CANCELLED" } },
          })
        ).reduce((acc, o) => acc + o.totalCents, 0);

      const baseShare = Math.floor(totalToSplit / parts);
      const remainder = totalToSplit - baseShare * parts;

      const splitAccounts = Array.from({ length: parts }).map((_, idx) => ({
        index: idx + 1,
        guestName: data.splitNames?.[idx] || `Cliente ${idx + 1}`,
        amountCents: idx === 0 ? baseShare + remainder : baseShare,
        paid: false,
      }));

      let updatedSession = openSession;
      if (openSession) {
        updatedSession = await prisma.gastroTableSession.update({
          where: { id: openSession.id },
          data: {
            splitAccountsJson: JSON.stringify(splitAccounts),
          },
          include: { orders: true },
        });
      }

      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: session.sub,
          action: "GASTRO_ACCOUNT_SPLIT",
          resource: "GASTRO_TABLE_SESSION",
          resourceId: openSession?.id || data.tableId,
          metadata: JSON.stringify({
            tableId: data.tableId,
            parts,
            totalToSplit,
            splitAccounts,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        splitAccounts,
        session: updatedSession,
      });
    }

    // 8. CERRAR SESIÓN DE CONSUMO Y LIBERAR MESA
    if (data.action === "CLOSE_TABLE_SESSION" && data.tableId) {
      await prisma.$transaction([
        prisma.gastroTableSession.updateMany({
          where: { tenantId, tableId: data.tableId, status: { in: ["OPEN", "PENDING_PAYMENT"] } },
          data: { status: "CLOSED", closedAt: new Date() },
        }),
        prisma.table.update({
          where: { id: data.tableId },
          data: { tableStatus: "AVAILABLE" },
        }),
      ]);

      realtimeBus.broadcast("global", "GASTRO_TABLE_SESSION_UPDATED", {
        tableId: data.tableId,
        tableStatus: "AVAILABLE",
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
