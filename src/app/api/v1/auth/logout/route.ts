import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/cookies";
import { getCurrentSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { handleApiError } from "@/lib/errors";

export async function POST() {
  try {
    const session = await getCurrentSession();

    if (session) {
      await prisma.auditLog.create({
        data: {
          tenantId: session.tenantId,
          userId: session.sub,
          action: "AUTH_LOGOUT",
          resource: "AUTH",
          resourceId: session.sub,
        },
      });
    }

    await clearSessionCookie();

    return NextResponse.json({
      success: true,
      message: "Sesión cerrada exitosamente",
    });
  } catch (error) {
    return handleApiError(error);
  }
}
