import { cookies } from "next/headers";
import { env } from "../env";

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: env.COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 horas
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(env.COOKIE_NAME);
}

export async function getSessionTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(env.COOKIE_NAME);
  return sessionCookie ? sessionCookie.value : null;
}
