import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { parseUserAgent } from "@/lib/auth/device-info";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const ipLimit = rateLimit(`qr-gen:ip:${ip}`, 30, 15 * 60 * 1000);
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Espera un momento." },
        { status: 429 }
      );
    }

    const ua = req.headers.get("user-agent");
    const deviceInfo = parseUserAgent(ua);

    // Generar código UUID seguro y PIN legible de 6 dígitos (ej: "482-913")
    const code = `cynko_qr_${crypto.randomUUID()}`;
    const rawPinNum = crypto.randomInt(100000, 999999).toString();
    const pin = `${rawPinNum.slice(0, 3)}-${rawPinNum.slice(3)}`;

    // Expiración: 3 minutos
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    // Determinar origen para el QR
    const host = req.headers.get("host") || "cynko.app";
    const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;
    const qrUrl = `${origin}/auth/qr-link?code=${code}`;

    // Limpiar sesiones expiradas previas de esta IP para mantener la tabla liviana
    try {
      await prisma.qrLoginSession.deleteMany({
        where: {
          expiresAt: { lt: new Date() },
        },
      });
    } catch {}

    const session = await prisma.qrLoginSession.create({
      data: {
        code,
        pin,
        status: "PENDING",
        userAgent: ua ? ua.slice(0, 255) : null,
        ipAddress: ip,
        deviceInfo,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      code: session.code,
      pin: session.pin,
      qrUrl,
      deviceInfo,
      expiresAt: session.expiresAt.toISOString(),
      expiresInSeconds: 180,
    });
  } catch (error) {
    console.error("[QR_GENERATE_ERROR]", error);
    return NextResponse.json(
      { error: "Error al generar sesión de QR" },
      { status: 500 }
    );
  }
}
