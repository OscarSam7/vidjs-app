import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { handleApiError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const { tenantId } = await requireTenantContext();
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");

    const where: any = { tenantId };
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const reservations = await prisma.tableReservation.findMany({
      where,
      include: {
        package: true,
        decoration: true,
        table: { select: { id: true, number: true, label: true, zone: true } },
        venue: { select: { id: true, name: true } },
        guests: {
          select: { id: true, guestName: true, checkedIn: true, checkedInAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      reservations,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
