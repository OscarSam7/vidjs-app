import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { setSessionCookie } from "@/lib/auth/cookies";
import { setClientSessionCookie, verifyClientToken } from "@/lib/client/client-auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Código requerido" }, { status: 400 });
    }

    const session = await prisma.qrLoginSession.findUnique({
      where: { code },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            tenant: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ status: "EXPIRED", error: "Sesión no encontrada o expirada" });
    }

    // Comprobar expiración
    if (new Date() > session.expiresAt) {
      if (session.status === "PENDING") {
        await prisma.qrLoginSession.update({
          where: { id: session.id },
          data: { status: "EXPIRED" },
        }).catch(() => {});
      }
      return NextResponse.json({ status: "EXPIRED" });
    }

    if (session.status === "REJECTED") {
      return NextResponse.json({ status: "REJECTED" });
    }

    // Caso A: Autorización desde la Super App de Cliente CYNKO (ClientMember)
    if (session.status === "APPROVED" && session.sessionToken?.startsWith("CLIENT:")) {
      const rawClientToken = session.sessionToken.slice("CLIENT:".length);
      const clientPayload = await verifyClientToken(rawClientToken);

      if (clientPayload) {
        await setClientSessionCookie(rawClientToken);

        await prisma.qrLoginSession.update({
          where: { id: session.id },
          data: {
            status: "CONSUMED",
            sessionToken: null,
          },
        });

        return NextResponse.json({
          status: "APPROVED",
          redirectUrl: "/app?tab=dj",
          user: {
            id: clientPayload.sub,
            name: clientPayload.name,
            email: clientPayload.email,
            role: "CYNKO CLUB",
            establishment: "CYNKO Super App",
          },
        });
      }
    }

    // Caso B: Autorización desde Staff / Dueño de Establecimiento (User)
    if (session.status === "APPROVED" && session.sessionToken && session.user) {
      // Establecer la cookie de sesión directamente en el navegador de la PC
      await setSessionCookie(session.sessionToken);

      // Consumir la sesión para que el token nunca pueda volver a usarse
      await prisma.qrLoginSession.update({
        where: { id: session.id },
        data: {
          status: "CONSUMED",
          sessionToken: null, // Borrar token de la base de datos por seguridad
        },
      });

      // Calcular redirección adecuada según el rol
      const role = session.user.role;
      let redirectUrl = "/dashboard";
      if (role === "DJ" || role === "OPERATOR") {
        redirectUrl = "/dashboard/dj";
      } else if (role === "CAJERO") {
        redirectUrl = "/dashboard/gastronomy/cashier";
      } else if (role === "MOZO") {
        redirectUrl = "/dashboard/gastronomy/waiters";
      } else if (role === "ENCARGADO_COCINA" || role === "COCINERO") {
        redirectUrl = "/dashboard/gastronomy/kitchen";
      } else if (role === "ENCARGADO_BARRA" || role === "OPERADOR_BARRA") {
        redirectUrl = "/dashboard/gastronomy/bar";
      }

      return NextResponse.json({
        status: "APPROVED",
        redirectUrl,
        user: {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          role: session.user.role,
          establishment: session.user.tenant?.name || "CYNKO OS",
        },
      });
    }

    return NextResponse.json({
      status: session.status,
    });
  } catch (error) {
    console.error("[QR_STATUS_ERROR]", error);
    return NextResponse.json(
      { error: "Error al consultar estado" },
      { status: 500 }
    );
  }
}
