import { prisma } from "@/lib/db/prisma";

/**
 * Cálculo de distancia geodésica mediante la fórmula de Haversine
 * Retorna la distancia en metros entre dos puntos (lat, lng).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c); // Distancia en metros redondeada
}

/**
 * Obtener fecha inicio del día (00:00:00) para agrupar asistencias
 */
export function getDayStart(dateInput?: string | Date): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDayEnd(dateInput?: string | Date): Date {
  const d = dateInput ? new Date(dateInput) : new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Obtener colaboradores y claves de invitación pendientes
 */
export async function getStaffMembers(tenantId: string, venueId?: string) {
  const where: any = { tenantId, status: "ACTIVE" };
  if (venueId) {
    where.OR = [{ venueId }, { venueId: null }];
  }

  const members = await prisma.staffMember.findMany({
    where,
    include: {
      venue: { select: { id: true, name: true, slug: true, latitude: true, longitude: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const now = new Date();
  const pendingKeys = members
    .filter((m) => m.inviteKey && m.inviteExpiresAt && m.inviteExpiresAt > now)
    .map((m) => ({
      staffMemberId: m.id,
      staffName: m.name,
      inviteKey: m.inviteKey,
      expiresAt: m.inviteExpiresAt,
    }));

  return { members, pendingKeys };
}

/**
 * Generar clave temporal de 24h para vincular app móvil
 */
export async function generateStaffInviteKey(staffMemberId: string) {
  // Clave de 6 caracteres: ZK-XXXX
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const inviteKey = `ZK-${randomChars}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 Horas

  const updated = await prisma.staffMember.update({
    where: { id: staffMemberId },
    data: {
      inviteKey,
      inviteExpiresAt: expiresAt,
    },
  });

  return { inviteKey, expiresAt, staffMember: updated };
}

/**
 * Obtener la planilla diaria de asistencias (Presentes, Ausentes, Tardanzas, etc.)
 */
export async function getDailyAttendanceSheet(
  tenantId: string,
  venueId?: string,
  targetDate?: string | Date
) {
  const dayStart = getDayStart(targetDate);
  const dayEnd = getDayEnd(targetDate);

  const staffWhere: any = { tenantId, status: "ACTIVE" };
  if (venueId) {
    staffWhere.OR = [{ venueId }, { venueId: null }];
  }

  const allStaff = await prisma.staffMember.findMany({
    where: staffWhere,
    include: {
      venue: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  const attendances = await prisma.staffAttendance.findMany({
    where: {
      tenantId,
      date: { gte: dayStart, lte: dayEnd },
    },
  });

  const attendanceMap = new Map<string, any>();
  attendances.forEach((att) => {
    attendanceMap.set(att.staffMemberId, att);
  });

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let permitCount = 0;
  let unrecordedCount = 0;

  const rows = allStaff.map((staff) => {
    const record = attendanceMap.get(staff.id);
    const status = record?.status || "SIN_REGISTRAR";

    if (status === "PRESENT") presentCount++;
    else if (status === "ABSENT") absentCount++;
    else if (status === "LATE") lateCount++;
    else if (status === "PERMIT") permitCount++;
    else unrecordedCount++;

    return {
      staffMember: staff,
      record: record || null,
      currentStatus: status,
    };
  });

  return {
    date: dayStart,
    summary: {
      total: allStaff.length,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      permit: permitCount,
      unrecorded: unrecordedCount,
    },
    rows,
  };
}

/**
 * Marcar asistencia manual desde la planilla del administrador
 */
export async function setManualAttendance(
  tenantId: string,
  staffMemberId: string,
  targetDate: string | Date,
  status: "PRESENT" | "ABSENT" | "LATE" | "PERMIT",
  venueId?: string,
  notes?: string
) {
  const dayStart = getDayStart(targetDate);

  const existing = await prisma.staffAttendance.findFirst({
    where: {
      tenantId,
      staffMemberId,
      date: dayStart,
    },
  });

  if (existing) {
    return prisma.staffAttendance.update({
      where: { id: existing.id },
      data: {
        status,
        type: "MANUAL",
        notes: notes !== undefined ? notes : existing.notes,
      },
    });
  }

  return prisma.staffAttendance.create({
    data: {
      tenantId,
      venueId: venueId || null,
      staffMemberId,
      date: dayStart,
      status,
      type: "MANUAL",
      notes,
    },
  });
}

/**
 * Obtener historial de marcaciones GPS (para admin con cálculo de horas)
 */
export async function getGpsAttendanceHistory(
  tenantId: string,
  venueId?: string,
  limit: number = 50
) {
  const where: any = {
    tenantId,
    type: "GPS",
  };
  if (venueId) {
    where.OR = [{ venueId }, { venueId: null }];
  }

  const records = await prisma.staffAttendance.findMany({
    where,
    include: {
      staffMember: { select: { id: true, name: true, role: true, email: true, phone: true } },
      venue: { select: { id: true, name: true, address: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return records;
}

/**
 * Validar geocerca y registrar ENTRADA desde la app móvil del colaborador
 */
export async function recordGpsCheckIn(
  staffMemberId: string,
  lat: number,
  lng: number,
  deviceId?: string
) {
  const staff = await prisma.staffMember.findUnique({
    where: { id: staffMemberId },
    include: {
      venue: true,
      tenant: { include: { venues: true } },
    },
  });

  if (!staff) {
    throw new Error("Colaborador no encontrado");
  }

  // Determinar la sucursal asignada o la principal del tenant
  const venue = staff.venue || staff.tenant.venues[0];
  if (!venue || venue.latitude == null || venue.longitude == null) {
    throw new Error("El local no tiene configurada la geolocalización GPS. Contacta a tu administrador.");
  }

  const radius = venue.gpsRadiusMeters || 100;
  const distance = calculateDistanceMeters(venue.latitude, venue.longitude, lat, lng);

  if (distance > radius) {
    throw new Error(
      `Te encuentras a ${distance} metros del local. Debes estar dentro del radio de ${radius}m para marcar entrada.`
    );
  }

  const dayStart = getDayStart();
  const now = new Date();

  // Verificar si ya tiene marcación hoy
  let attendance = await prisma.staffAttendance.findFirst({
    where: {
      staffMemberId: staff.id,
      date: dayStart,
    },
  });

  if (attendance && attendance.checkInAt) {
    throw new Error("Ya tienes una entrada registrada para el día de hoy.");
  }

  if (attendance) {
    attendance = await prisma.staffAttendance.update({
      where: { id: attendance.id },
      data: {
        type: "GPS",
        status: "PRESENT",
        checkInAt: now,
        checkInLat: lat,
        checkInLng: lng,
        checkInDistance: distance,
        checkInVerified: true,
      },
    });
  } else {
    attendance = await prisma.staffAttendance.create({
      data: {
        tenantId: staff.tenantId,
        venueId: venue.id,
        staffMemberId: staff.id,
        date: dayStart,
        type: "GPS",
        status: "PRESENT",
        checkInAt: now,
        checkInLat: lat,
        checkInLng: lng,
        checkInDistance: distance,
        checkInVerified: true,
      },
    });
  }

  // Actualizar que tiene la app móvil vinculada
  await prisma.staffMember.update({
    where: { id: staff.id },
    data: { hasApp: true, appDeviceId: deviceId || staff.appDeviceId },
  });

  return {
    success: true,
    checkInAt: attendance.checkInAt,
    distance,
    venueName: venue.name,
  };
}

/**
 * Validar geocerca y registrar SALIDA desde la app móvil del colaborador
 */
export async function recordGpsCheckOut(staffMemberId: string, lat: number, lng: number) {
  const staff = await prisma.staffMember.findUnique({
    where: { id: staffMemberId },
    include: {
      venue: true,
      tenant: { include: { venues: true } },
    },
  });

  if (!staff) {
    throw new Error("Colaborador no encontrado");
  }

  const venue = staff.venue || staff.tenant.venues[0];
  if (!venue || venue.latitude == null || venue.longitude == null) {
    throw new Error("El local no tiene configurada la geolocalización GPS.");
  }

  const radius = venue.gpsRadiusMeters || 100;
  const distance = calculateDistanceMeters(venue.latitude, venue.longitude, lat, lng);

  if (distance > radius) {
    throw new Error(
      `Te encuentras a ${distance} metros del local. Debes estar dentro del radio de ${radius}m para marcar salida.`
    );
  }

  const dayStart = getDayStart();
  const now = new Date();

  const attendance = await prisma.staffAttendance.findFirst({
    where: {
      staffMemberId: staff.id,
      date: dayStart,
    },
  });

  if (!attendance || !attendance.checkInAt) {
    throw new Error("No tienes una entrada registrada hoy para marcar salida.");
  }

  if (attendance.checkOutAt) {
    throw new Error("Ya has registrado tu salida el día de hoy.");
  }

  // Calcular horas trabajadas en el servidor para el reporte del administrador
  const diffMs = now.getTime() - new Date(attendance.checkInAt).getTime();
  const workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

  const updated = await prisma.staffAttendance.update({
    where: { id: attendance.id },
    data: {
      checkOutAt: now,
      checkOutLat: lat,
      checkOutLng: lng,
      checkOutDistance: distance,
      checkOutVerified: true,
      workHours,
    },
  });

  return {
    success: true,
    checkInAt: updated.checkInAt,
    checkOutAt: updated.checkOutAt,
    distance,
    venueName: venue.name,
  };
}
