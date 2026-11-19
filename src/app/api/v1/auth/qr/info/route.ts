import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const pin = searchParams.get("pin");

    if (!code && !pin) {
      return NextResponse.json({ error: "Código o PIN requerido" }, { status: 400 });
    }

    const session = await prisma.qrLoginSession.findFirst({
      where: code ? { code } : { pin: pin?.trim() },
      select: {
        id: true,
        code: true,
        pin: true,
        status: true,
        deviceInfo: true,
        ipAddress: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada", valid: false }, { status: 404 });
    }

    const isExpired = new Date() > session.expiresAt || session.status === "EXPIRED" || session.status === "CONSUMED";

    return NextResponse.json({
      valid: !isExpired && session.status === "PENDING",
      code: session.code,
      pin: session.pin,
      deviceInfo: session.deviceInfo || "PC / Navegador Web",
      ipAddress: session.ipAddress,
      status: isExpired ? "EXPIRED" : session.status,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("[QR_INFO_ERROR]", error);
    return NextResponse.json({ error: "Error al obtener información" }, { status: 500 });
  }
}
