import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const venueId = searchParams.get("venueId");

    let venue = null;
    if (venueId) {
      venue = await prisma.venue.findUnique({
        where: { id: venueId },
        select: { id: true, name: true, slug: true, address: true, latitude: true, longitude: true, gpsRadiusMeters: true },
      });
    } else {
      venue = await prisma.venue.findFirst({
        select: { id: true, name: true, slug: true, address: true, latitude: true, longitude: true, gpsRadiusMeters: true },
      });
    }

    if (!venue) {
      return NextResponse.json({ success: false, error: "Sucursal no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { venue } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al obtener GPS de la sucursal" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { venueId, latitude, longitude, gpsRadiusMeters } = body;

    let targetId = venueId;
    if (!targetId) {
      const first = await prisma.venue.findFirst({ select: { id: true } });
      targetId = first?.id;
    }

    if (!targetId) {
      return NextResponse.json({ success: false, error: "Sucursal no encontrada" }, { status: 400 });
    }

    const updated = await prisma.venue.update({
      where: { id: targetId },
      data: {
        latitude: latitude != null ? parseFloat(latitude) : null,
        longitude: longitude != null ? parseFloat(longitude) : null,
        gpsRadiusMeters: gpsRadiusMeters != null ? parseInt(gpsRadiusMeters, 10) : 100,
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        gpsRadiusMeters: true,
      },
    });

    return NextResponse.json({ success: true, data: { venue: updated } });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al guardar coordenadas GPS" },
      { status: 500 }
    );
  }
}
