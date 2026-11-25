import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/session";
import { getCurrentClientSession } from "@/lib/client/client-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

const submitReviewSchema = z.object({
  action: z.literal("submit"),
  tenantId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().max(600).optional(),
  authorName: z.string().max(80).optional(),
  source: z.enum(["APP", "TABLE", "BEEPER"]).default("APP"),
});

const updateGoogleUrlSchema = z.object({
  action: z.literal("update_google_url"),
  googleReviewUrl: z.string().max(500),
});

async function resolveStaffTenantId(session: { tenantId: string | null; role: string }) {
  if (session.tenantId) return session.tenantId;
  if (session.role === "SUPER_ADMIN") {
    const first = await prisma.tenant.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    return first?.id || null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let tenantId = searchParams.get("tenantId");

    if (!tenantId) {
      const staffSession = await getCurrentSession();
      if (!staffSession) {
        return NextResponse.json({ error: "tenantId requerido" }, { status: 400 });
      }
      tenantId = await resolveStaffTenantId(staffSession);
    }

    if (!tenantId) {
      return NextResponse.json({ error: "Local no encontrado" }, { status: 404 });
    }

    const [reviews, agg, venue] = await Promise.all([
      prisma.venueReview.findMany({
        where: { tenantId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.venueReview.aggregate({
        where: { tenantId },
        _avg: { rating: true },
        _count: { id: true },
      }),
      prisma.venue.findFirst({
        where: { tenantId, active: true },
        select: { id: true, name: true, googleReviewUrl: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        avgRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : 0,
        reviewsCount: agg._count.id,
        googleReviewUrl: venue?.googleReviewUrl || "",
        reviews,
      },
    });
  } catch (error) {
    console.error("[REVIEWS_GET_ERROR]", error);
    return NextResponse.json({ error: "Error cargando reseñas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // 1. Dueño/Staff actualiza el enlace directo de Google Reviews del local
    if (body?.action === "update_google_url") {
      const staffSession = await getCurrentSession();
      if (!staffSession) {
        return NextResponse.json({ error: "No autorizado" }, { status: 401 });
      }

      const parsed = updateGoogleUrlSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "URL inválida" }, { status: 400 });
      }

      const tenantId = await resolveStaffTenantId(staffSession);
      if (!tenantId) {
        return NextResponse.json({ error: "Establecimiento no encontrado" }, { status: 404 });
      }

      const rawUrl = parsed.data.googleReviewUrl.trim();
      if (rawUrl && !/^https?:\/\//i.test(rawUrl)) {
        return NextResponse.json(
          { error: "El enlace debe comenzar con https:// (ej: https://g.page/r/.../review)" },
          { status: 400 }
        );
      }

      const venue = await prisma.venue.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });

      if (!venue) {
        return NextResponse.json({ error: "No hay una sede registrada para este local" }, { status: 404 });
      }

      await prisma.venue.update({
        where: { id: venue.id },
        data: { googleReviewUrl: rawUrl || null },
      });

      return NextResponse.json({
        success: true,
        googleReviewUrl: rawUrl,
        message: rawUrl
          ? "✅ Enlace de Google Reviews guardado. Ya aparece activo para tus clientes."
          : "Enlace de Google Reviews eliminado.",
      });
    }

    // 2. Cliente envía calificación y comentario sobre un local
    if (body?.action === "submit") {
      const ip = getClientIp(req);
      const limit = rateLimit(`venue-review:ip:${ip}`, 10, 15 * 60 * 1000);
      if (!limit.success) {
        return NextResponse.json(
          { error: "Has enviado varias reseñas hace poco. Intenta en unos minutos." },
          { status: 429 }
        );
      }

      const parsed = submitReviewSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Calificación inválida (1 a 5 estrellas)" }, { status: 400 });
      }

      const clientSession = await getCurrentClientSession();
      const authorName =
        clientSession?.name ||
        (parsed.data.authorName ? sanitizeText(parsed.data.authorName).trim() : "") ||
        "Cliente CYNKO";

      const review = await prisma.venueReview.create({
        data: {
          tenantId: parsed.data.tenantId,
          clientId: clientSession?.sub || null,
          authorName,
          rating: parsed.data.rating,
          comment: parsed.data.comment ? sanitizeText(parsed.data.comment).trim() : null,
          source: parsed.data.source,
        },
      });

      const [agg, venue] = await Promise.all([
        prisma.venueReview.aggregate({
          where: { tenantId: parsed.data.tenantId },
          _avg: { rating: true },
          _count: { id: true },
        }),
        prisma.venue.findFirst({
          where: { tenantId: parsed.data.tenantId, active: true },
          select: { googleReviewUrl: true },
        }),
      ]);

      return NextResponse.json({
        success: true,
        review,
        avgRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(1)) : parsed.data.rating,
        reviewsCount: agg._count.id,
        googleReviewUrl: venue?.googleReviewUrl || null,
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("[REVIEWS_POST_ERROR]", error);
    return NextResponse.json({ error: "Error procesando reseña" }, { status: 500 });
  }
}
