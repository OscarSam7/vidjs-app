import { NextRequest, NextResponse } from "next/server";
import { recordGpsCheckIn, recordGpsCheckOut } from "@/lib/staff/staff-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { staffId, action, latitude, longitude, deviceId } = body;

    if (!staffId || !action || latitude == null || longitude == null) {
      return NextResponse.json(
        {
          success: false,
          error: "Faltan datos de geolocalización o de colaborador. Asegúrate de activar el GPS.",
        },
        { status: 400 }
      );
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { success: false, error: "Coordenadas GPS no válidas." },
        { status: 400 }
      );
    }

    if (action === "CHECK_IN") {
      const result = await recordGpsCheckIn(staffId, lat, lng, deviceId);
      return NextResponse.json({
        success: true,
        message: "¡Entrada registrada correctamente!",
        data: {
          checkInAt: result.checkInAt,
          distance: result.distance,
          venueName: result.venueName,
        },
      });
    } else if (action === "CHECK_OUT") {
      const result = await recordGpsCheckOut(staffId, lat, lng);
      return NextResponse.json({
        success: true,
        message: "¡Salida registrada correctamente!",
        data: {
          checkInAt: result.checkInAt,
          checkOutAt: result.checkOutAt,
          distance: result.distance,
          venueName: result.venueName,
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: "Acción de marcación no reconocida (CHECK_IN o CHECK_OUT)." },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Error al registrar marcación" },
      { status: 400 }
    );
  }
}
