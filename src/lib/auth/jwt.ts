import { SignJWT, jwtVerify } from "jose";
import { Role } from "../rbac/permissions";
import { env } from "../env";

export interface SessionPayload {
  sub: string; // User ID
  email: string;
  name: string;
  role: Role;
  tenantId: string | null;
  tokenVersion: number;
}

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secretKey);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
