import { NextRequest, NextResponse } from "next/server";
import { requireTenantContext, requireRole } from "@/lib/auth/session";
import { getBeeperConfig, updateBeeperConfig } from "@/lib/beeper/beeper-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN", "OPERATOR"]);
    const { tenantId } = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId") || undefined;

    const config = await getBeeperConfig(tenantId, venueId);
    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener configuración de llamadores" },
      { status: error.status || 400 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireRole(["OWNER", "MANAGER", "SUPER_ADMIN"]);
    const { tenantId } = await requireTenantContext();
    const body = await req.json();

    const updated = await updateBeeperConfig(tenantId, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al actualizar configuración de llamadores" },
      { status: error.status || 400 }
    );
  }
}
