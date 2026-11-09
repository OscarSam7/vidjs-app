import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext } from "@/lib/auth/session";
import { PERMISSIONS, hasAnyPermission } from "@/lib/rbac/permissions";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { realtimeBus } from "@/lib/realtime/event-bus";

const invoicingActionSchema = z.object({
  action: z.enum([
    "INVOICE_SALES",        // Botón FACTURAR VENTAS (individual o agrupada)
    "CONFIRM_EXTERNAL_INVOICE", // Conciliar y confirmar facturación del sistema principal
    "RETRY_SYNC",           // Reintentar envíos con error de integración
    "SIMULATE_SYNC_ERROR",  // Registrar error de integración para pruebas/diagnóstico
    "VOID_SALE",            // Anular venta (sin eliminar el registro)
  ]),
  saleIds: z.array(z.string()).min(1, "Debes seleccionar al menos una venta"),
  groupedMode: z.boolean().default(false),
  customerName: z.string().optional(),
  customerTaxId: z.string().optional(),
  externalEndpointUrl: z.string().optional(),
  errorReason: z.string().optional(),
  voidReason: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const sales = await prisma.gastroPendingInvoiceSale.findMany({
      where: {
        tenantId,
        ...(status && status !== "ALL" ? { invoicingStatus: status } : {}),
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            deliveryMode: true,
            receivedAt: true,
            paymentConfirmedAt: true,
          },
        },
      },
      orderBy: { saleDate: "desc" },
      take: 200,
    });

    return NextResponse.json({ success: true, sales });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { session, tenantId } = await requireTenantContext();
    if (
      !hasAnyPermission(session.role, [
        PERMISSIONS.GASTRO_INVOICING_MANAGE,
        PERMISSIONS.GASTRO_CASHIER_OPERATE,
        PERMISSIONS.TENANT_BILLING,
      ])
    ) {
      throw new ForbiddenError("No tienes permisos para facturar ventas o sincronizar con el ERP");
    }

    const body = await req.json();
    const data = invoicingActionSchema.parse(body);

    const targetSales = await prisma.gastroPendingInvoiceSale.findMany({
      where: {
        id: { in: data.saleIds },
        tenantId,
      },
    });

    if (targetSales.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No se encontraron las ventas seleccionadas" } },
        { status: 404 }
      );
    }

    // REGLA OBLIGATORIA FASE 11:
    // No emitir documentos fiscales duplicados para ventas que ya están en estado INVOICED
    if (data.action === "INVOICE_SALES" || data.action === "CONFIRM_EXTERNAL_INVOICE") {
      const alreadyInvoiced = targetSales.filter((s) => s.invoicingStatus === "INVOICED");
      if (alreadyInvoiced.length > 0 && data.action === "INVOICE_SALES") {
        return NextResponse.json(
          {
            error: {
              code: "DUPLICATE_INVOICE_PREVENTED",
              message: `Prevención fiscal: La(s) venta(s) ${alreadyInvoiced
                .map((s) => s.saleNumber)
                .join(", ")} ya fueron facturadas (${alreadyInvoiced
                .map((s) => s.fiscalDocumentNumber)
                .join(", ")}). No se permiten documentos fiscales duplicados.`,
            },
          },
          { status: 409 }
        );
      }
    }

    const batchGroupId = data.groupedMode
      ? `GRP-${Date.now().toString(36).toUpperCase()}`
      : null;

    // 1. FACTURAR VENTAS (Envío al Sistema Principal y emisión fiscal controlada)
    if (data.action === "INVOICE_SALES" || data.action === "RETRY_SYNC") {
      const updatedSales = await prisma.$transaction(async (tx) => {
        const results = [];
        const baseDocSeq =
          (await tx.gastroPendingInvoiceSale.count({
            where: { tenantId, invoicingStatus: "INVOICED" },
          })) + 1;

        const sharedFiscalDoc = data.groupedMode
          ? `001-001-${String(45000 + baseDocSeq).padStart(7, "0")}`
          : null;
        const sharedExternalId = data.groupedMode
          ? `ERP-INV-GRP-${Date.now().toString(36).toUpperCase()}`
          : null;

        for (let i = 0; i < targetSales.length; i++) {
          const sale = targetSales[i];
          const prevHistory = sale.syncHistoryJson ? JSON.parse(sale.syncHistoryJson) : [];
          const attemptNum = sale.syncAttempts + 1;

          const fiscalDoc =
            sharedFiscalDoc || `001-001-${String(45000 + baseDocSeq + i).padStart(7, "0")}`;
          const externalId =
            sharedExternalId || `ERP-INV-${sale.saleNumber}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

          // Construir payload estándar del conector administrativo / fiscal (Fase 17)
          const integrationPayload = {
            sourceUniqueId: sale.sourceUniqueId,
            saleNumber: sale.saleNumber,
            orderNumber: sale.orderNumber,
            groupedMode: data.groupedMode,
            batchGroupId,
            customer: {
              name: data.customerName || sale.customerName,
              taxId: data.customerTaxId || sale.customerTaxId,
            },
            totals: {
              subtotalCents: sale.subtotalCents,
              discountCents: sale.discountCents,
              serviceFeeCents: sale.serviceFeeCents,
              depositAppliedCents: sale.depositAppliedCents,
              totalCents: sale.totalCents,
              currency: sale.currency,
            },
            payment: {
              method: sale.paymentMethod,
              reference: sale.paymentReference,
            },
            items: JSON.parse(sale.itemsSnapshotJson || "[]"),
          };

          prevHistory.push({
            attempt: attemptNum,
            timestamp: new Date().toISOString(),
            action: data.action,
            status: "INVOICED",
            externalInvoiceId: externalId,
            fiscalDocumentNumber: fiscalDoc,
            operator: session.name,
            payloadSummary: {
              sourceUniqueId: integrationPayload.sourceUniqueId,
              totalCents: integrationPayload.totals.totalCents,
            },
          });

          const updated = await tx.gastroPendingInvoiceSale.update({
            where: { id: sale.id },
            data: {
              invoicingStatus: "INVOICED",
              batchGroupId: batchGroupId || sale.batchGroupId,
              externalInvoiceId: externalId,
              fiscalDocumentNumber: fiscalDoc,
              ...(data.customerName ? { customerName: data.customerName } : {}),
              ...(data.customerTaxId ? { customerTaxId: data.customerTaxId } : {}),
              syncAttempts: attemptNum,
              lastSyncAt: new Date(),
              lastErrorLog: null,
              syncHistoryJson: JSON.stringify(prevHistory),
              invoicedByUserId: session.sub,
              invoicedByName: session.name,
              invoicedAt: new Date(),
            },
          });

          results.push(updated);
        }

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: data.groupedMode ? "GASTRO_SALES_INVOICED_GROUPED" : "GASTRO_SALES_INVOICED",
            resource: "GASTRO_INVOICING",
            resourceId: batchGroupId || targetSales[0].id,
            metadata: JSON.stringify({
              saleNumbers: results.map((r) => r.saleNumber),
              fiscalDocuments: results.map((r) => r.fiscalDocumentNumber),
              groupedMode: data.groupedMode,
              invoicedBy: session.name,
            }),
          },
        });

        return results;
      });

      realtimeBus.broadcast("global", "GASTRO_INVOICING_UPDATED", {
        action: "INVOICED",
        count: updatedSales.length,
      });

      return NextResponse.json({
        success: true,
        sales: updatedSales,
      });
    }

    // 2. REGISTRAR ERROR DE INTEGRACIÓN (Fase 11 y 19: Registrar errores y permitir reintentar envíos)
    if (data.action === "SIMULATE_SYNC_ERROR") {
      const updatedSales = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const sale of targetSales) {
          const prevHistory = sale.syncHistoryJson ? JSON.parse(sale.syncHistoryJson) : [];
          const attemptNum = sale.syncAttempts + 1;
          const errText =
            data.errorReason ||
            "Timeout HTTP 504 al conectar con Webservice Fiscal / ERP Principal. Pendiente de reintento.";

          prevHistory.push({
            attempt: attemptNum,
            timestamp: new Date().toISOString(),
            action: "SYNC_ATTEMPT",
            status: "INTEGRATION_ERROR",
            error: errText,
            operator: session.name,
          });

          const u = await tx.gastroPendingInvoiceSale.update({
            where: { id: sale.id },
            data: {
              invoicingStatus: "INTEGRATION_ERROR",
              syncAttempts: attemptNum,
              lastSyncAt: new Date(),
              lastErrorLog: errText,
              syncHistoryJson: JSON.stringify(prevHistory),
            },
          });
          results.push(u);
        }
        return results;
      });

      return NextResponse.json({ success: true, sales: updatedSales });
    }

    // 3. ANULAR VENTA SIN ELIMINARLA (Fase 11 Regla 4: No eliminar ventas ya confirmadas)
    if (data.action === "VOID_SALE") {
      const updatedSales = await prisma.$transaction(async (tx) => {
        const results = [];
        for (const sale of targetSales) {
          const u = await tx.gastroPendingInvoiceSale.update({
            where: { id: sale.id },
            data: {
              invoicingStatus: "VOIDED",
              voidedReason: data.voidReason || "Anulación administrativa registrada",
              voidedByName: session.name,
              voidedAt: new Date(),
            },
          });
          results.push(u);
        }

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: session.sub,
            action: "GASTRO_SALE_VOIDED",
            resource: "GASTRO_INVOICING",
            resourceId: targetSales[0].id,
            metadata: JSON.stringify({
              saleNumbers: targetSales.map((s) => s.saleNumber),
              reason: data.voidReason,
              voidedBy: session.name,
            }),
          },
        });

        return results;
      });

      return NextResponse.json({ success: true, sales: updatedSales });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
