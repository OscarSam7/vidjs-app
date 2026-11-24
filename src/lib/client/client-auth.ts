import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";
import { env } from "@/lib/env";

export const CLIENT_COOKIE_NAME = "cynko_client_session";

export interface ClientSessionPayload {
  sub: string; // ClientMember ID
  email: string;
  name: string;
  cynkoCode: string;
  type: "CLIENT_MEMBER";
}

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

export async function signClientToken(payload: ClientSessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

export async function verifyClientToken(token: string): Promise<ClientSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if ((payload as { type?: string }).type !== "CLIENT_MEMBER") {
      return null;
    }
    return payload as unknown as ClientSessionPayload;
  } catch {
    return null;
  }
}

export async function setClientSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CLIENT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
}

export async function clearClientSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_COOKIE_NAME);
}

export async function getCurrentClientSession(): Promise<ClientSessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(CLIENT_COOKIE_NAME)?.value;
    if (!token) return null;
    return await verifyClientToken(token);
  } catch {
    return null;
  }
}

export function calculateClubTier(lifetimePoints: number): "BRONCE" | "PLATA" | "ORO" | "BLACK" {
  if (lifetimePoints >= 5000) return "BLACK";
  if (lifetimePoints >= 1500) return "ORO";
  if (lifetimePoints >= 500) return "PLATA";
  return "BRONCE";
}

export function getNextTierInfo(lifetimePoints: number) {
  if (lifetimePoints >= 5000) {
    return { current: "BLACK", next: null, remaining: 0, progressPct: 100 };
  }
  if (lifetimePoints >= 1500) {
    return {
      current: "ORO",
      next: "BLACK",
      remaining: 5000 - lifetimePoints,
      progressPct: Math.min(100, Math.round(((lifetimePoints - 1500) / 3500) * 100)),
    };
  }
  if (lifetimePoints >= 500) {
    return {
      current: "PLATA",
      next: "ORO",
      remaining: 1500 - lifetimePoints,
      progressPct: Math.min(100, Math.round(((lifetimePoints - 500) / 1000) * 100)),
    };
  }
  return {
    current: "BRONCE",
    next: "PLATA",
    remaining: 500 - lifetimePoints,
    progressPct: Math.min(100, Math.round((lifetimePoints / 500) * 100)),
  };
}

export function generateCynkoCode(): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 5);
  return `CYK-${rand}`;
}

export function generateReferralCode(name: string): string {
  const clean = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 5);
  const rand = crypto.randomBytes(2).toString("hex").toUpperCase().slice(0, 3);
  return `${clean || "CYNKO"}${rand}`;
}

export function generateRedemptionCode(): string {
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase().slice(0, 6);
  return `RDM-${rand}`;
}
