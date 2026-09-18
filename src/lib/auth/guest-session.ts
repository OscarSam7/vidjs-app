import { cookies } from "next/headers";
import { prisma } from "../db/prisma";

const GUEST_COOKIE_NAME = "vidjs_guest_session";

export async function setGuestSessionCookie(sessionToken: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: GUEST_COOKIE_NAME,
    value: sessionToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12, // 12 horas (duración de la noche)
  });
}

export async function getGuestSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(GUEST_COOKIE_NAME);
  return cookie ? cookie.value : null;
}

export async function getCurrentGuestSession() {
  const token = await getGuestSessionToken();
  if (!token) return null;

  const session = await prisma.guestSession.findUnique({
    where: { sessionToken: token },
    include: {
      tenant: {
        select: { id: true, name: true, slug: true, logoUrl: true, settings: true },
      },
      event: {
        select: { id: true, name: true, code: true, status: true, startsAt: true, settings: true },
      },
      table: {
        select: {
          id: true,
          number: true,
          label: true,
          zone: true,
          venueId: true,
          venue: { select: { id: true, name: true, settings: true } },
        },
      },
    },
  });

  if (!session) return null;

  // Verificar si expiró
  if (new Date(session.expiresAt) < new Date()) {
    return null;
  }

  return session;
}
