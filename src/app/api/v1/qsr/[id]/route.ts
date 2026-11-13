import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId, session } = await requireTenantContext();
    const { id } = await params;

    const body = await req.json().catch(() => ({}));
    const { status, resolutionSummary, newInternalNote, priority } = body;

    // Verificar existencia del ticket
    const existing = await prisma.qsrTicket.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ticket QSR no encontrado." }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && existing.tenantId !== tenantId) {
      return NextResponse.json({ error: "No autorizado para modificar este ticket." }, { status: 403 });
    }

    const updateData: any = {};

    if (status) {
      const validStatuses = ["PENDING", "IN_PROGRESS", "RESOLVED", "ARCHIVED"];
      if (validStatuses.includes(status)) {
        updateData.status = status;
        if (status === "RESOLVED") {
          updateData.resolvedAt = new Date();
          updateData.resolvedByRole = session.role;
          updateData.resolvedByName = session.name || "Gerencia";
        }
      }
    }

    if (priority) {
      const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
      if (validPriorities.includes(priority)) {
        updateData.priority = priority;
      }
    }

    if (typeof resolutionSummary === "string") {
      updateData.resolutionSummary = resolutionSummary.trim();
    }

    // Agregar nueva nota interna privada si se proporcionó
    if (newInternalNote && typeof newInternalNote === "string" && newInternalNote.trim().length > 0) {
      let notes = [];
      try {
        if (existing.internalNotes) {
          notes = JSON.parse(existing.internalNotes);
        }
      } catch {
        notes = [];
      }

      notes.push({
        id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        text: newInternalNote.trim(),
        authorRole: session.role,
        authorName: session.name || "Gerencia",
        createdAt: new Date().toISOString(),
      });

      updateData.internalNotes = JSON.stringify(notes);
    }

    const updated = await prisma.qsrTicket.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ok: true,
      ticket: {
        ...updated,
        internalNotes: updated.internalNotes ? JSON.parse(updated.internalNotes) : [],
      },
    });
  } catch (error: any) {
    if (error?.status === 403 || error?.message?.includes("Forbidden")) {
      return NextResponse.json(
        { error: "Acceso denegado. Este buzón es confidencial para Gerencia y Dueño." },
        { status: 403 }
      );
    }
    console.error("[QSR PATCH ERROR]", error);
    return NextResponse.json(
      { error: "Error al actualizar el ticket." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireRole(["OWNER", "SUPER_ADMIN"]); // Solo Dueño o Super Admin pueden eliminar definitivamente
    const { tenantId, session } = await requireTenantContext();
    const { id } = await params;

    const existing = await prisma.qsrTicket.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });
    }

    if (session.role !== "SUPER_ADMIN" && existing.tenantId !== tenantId) {
      return NextResponse.json({ error: "No autorizado." }, { status: 403 });
    }

    await prisma.qsrTicket.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true, message: "Ticket eliminado exitosamente." });
  } catch (error: any) {
    if (error?.status === 403) {
      return NextResponse.json(
        { error: "Solo el Dueño del establecimiento puede eliminar registros del buzón." },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Error al eliminar ticket." }, { status: 500 });
  }
}
