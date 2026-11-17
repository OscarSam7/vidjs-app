import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleTicketAction } from "@/lib/beeper/beeper-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const action = body.action as "CALL" | "RING_AGAIN" | "DELIVER" | "ACKNOWLEDGE" | "EXPIRE";

    if (!action) {
      return NextResponse.json(
        { success: false, error: "Acción requerida (CALL, RING_AGAIN, DELIVER, ACKNOWLEDGE, EXPIRE)" },
        { status: 400 }
      );
    }

    // Si es ACKNOWLEDGE, el cliente público puede dispararlo sin requerir sesión de admin
    if (action === "ACKNOWLEDGE") {
      const { prisma } = await import("@/lib/db/prisma");
      const ticket = await prisma.beeperTicket.findUnique({ where: { id } });
      if (!ticket) {
        return NextResponse.json({ success: false, error: "Llamador no encontrado" }, { status: 404 });
      }

      const updated = await handleTicketAction({
        tenantId: ticket.tenantId,
        ticketId: id,
        action: "ACKNOWLEDGE",
      });

      return NextResponse.json({ success: true, data: updated });
    }

    // Para el resto de acciones (CALL, RING_AGAIN, DELIVER, EXPIRE), se requiere rol operativo
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN", "OPERATOR"]);
    const { tenantId } = await requireTenantContext();

    const updated = await handleTicketAction({
      tenantId,
      ticketId: id,
      action,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al procesar acción del llamador" },
      { status: error.status || 400 }
    );
  }
}
