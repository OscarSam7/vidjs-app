import { NextRequest, NextResponse } from "next/server";
import { generateStaffInviteKey } from "@/lib/staff/staff-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await generateStaffInviteKey(id);

    return NextResponse.json({
      success: true,
      data: {
        inviteKey: result.inviteKey,
        expiresAt: result.expiresAt,
        staffMember: result.staffMember,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al generar clave de invitación" },
      { status: 500 }
    );
  }
}
