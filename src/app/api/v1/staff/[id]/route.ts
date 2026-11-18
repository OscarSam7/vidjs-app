import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, role, salaryType, salaryAmount, venueId, status } = body;

    const updated = await prisma.staffMember.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(role !== undefined && { role }),
        ...(salaryType !== undefined && { salaryType }),
        ...(salaryAmount !== undefined && { salaryAmount: salaryAmount ? parseFloat(salaryAmount) : null }),
        ...(venueId !== undefined && { venueId: venueId || null }),
        ...(status !== undefined && { status }),
      },
      include: {
        venue: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: { staffMember: updated } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar colaborador" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.staffMember.update({
      where: { id },
      data: { status: "INACTIVE" },
    });

    return NextResponse.json({ success: true, message: "Colaborador desactivado correctamente" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al desactivar colaborador" },
      { status: 500 }
    );
  }
}
