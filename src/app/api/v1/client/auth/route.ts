import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { hashPassword, verifyPassword, dummyVerifyPassword } from "@/lib/auth/password";
import {
  getCurrentClientSession,
  signClientToken,
  setClientSessionCookie,
  clearClientSessionCookie,
  calculateClubTier,
  getNextTierInfo,
  generateCynkoCode,
  generateReferralCode,
} from "@/lib/client/client-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { sanitizeText } from "@/lib/security/sanitize";

const registerSchema = z.object({
  action: z.literal("register"),
  name: z.string().min(2, "Ingresa tu nombre").max(80),
  email: z.string().email("Correo electrónico inválido").max(120),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100),
  phone: z.string().max(30).optional(),
  referralCode: z.string().max(30).optional(),
});

const loginSchema = z.object({
  action: z.literal("login"),
  email: z.string().email("Correo electrónico inválido").max(120),
  password: z.string().min(1, "Ingresa tu contraseña").max(100),
});

const logoutSchema = z.object({
  action: z.literal("logout"),
});

async function buildClientProfile(clientId: string) {
  const client = await prisma.clientMember.findUnique({
    where: { id: clientId },
    include: {
      venueMemberships: {
        include: {
          tenant: { select: { id: true, name: true, slug: true, logoUrl: true } },
        },
        orderBy: { points: "desc" },
        take: 20,
      },
      pointTransactions: {
        include: {
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 25,
      },
      redemptions: {
        include: {
          reward: { select: { id: true, title: true, category: true, pointsCost: true } },
          tenant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!client || client.status !== "ACTIVE") return null;

  const referralCount = await prisma.clientMember.count({
    where: { referredById: client.id },
  });

  return {
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone,
    cynkoCode: client.cynkoCode,
    referralCode: client.referralCode,
    globalPoints: client.globalPoints,
    lifetimePoints: client.lifetimePoints,
    tier: client.tier,
    tierProgress: getNextTierInfo(client.lifetimePoints),
    referralCount,
    createdAt: client.createdAt,
    venueMemberships: client.venueMemberships,
    pointTransactions: client.pointTransactions,
    redemptions: client.redemptions,
  };
}

export async function GET() {
  try {
    const session = await getCurrentClientSession();
    if (!session) {
      return NextResponse.json({ authenticated: false, client: null });
    }

    const client = await buildClientProfile(session.sub);
    if (!client) {
      await clearClientSessionCookie();
      return NextResponse.json({ authenticated: false, client: null });
    }

    return NextResponse.json({ authenticated: true, client });
  } catch (error) {
    console.error("[CLIENT_AUTH_GET_ERROR]", error);
    return NextResponse.json({ error: "Error al verificar sesión de cliente" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimit(`client-auth:ip:${ip}`, 25, 15 * 60 * 1000);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera unos minutos." },
        { status: 429 }
      );
    }

    const body = await req.json();

    // LOGOUT
    if (body?.action === "logout") {
      logoutSchema.parse(body);
      await clearClientSessionCookie();
      return NextResponse.json({ success: true });
    }

    // LOGIN
    if (body?.action === "login") {
      const parsed = loginSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Datos inválidos" },
          { status: 400 }
        );
      }

      const email = sanitizeText(parsed.data.email).toLowerCase().trim();
      const client = await prisma.clientMember.findUnique({ where: { email } });

      if (!client) {
        await dummyVerifyPassword(parsed.data.password);
        return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
      }

      if (client.status !== "ACTIVE") {
        return NextResponse.json({ error: "Esta cuenta se encuentra suspendida" }, { status: 403 });
      }

      const valid = await verifyPassword(parsed.data.password, client.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: "Correo o contraseña incorrectos" }, { status: 401 });
      }

      const token = await signClientToken({
        sub: client.id,
        email: client.email,
        name: client.name,
        cynkoCode: client.cynkoCode,
        type: "CLIENT_MEMBER",
      });
      await setClientSessionCookie(token);

      const profile = await buildClientProfile(client.id);
      return NextResponse.json({ success: true, client: profile });
    }

    // REGISTER (Instantáneo + Bono de Bienvenida + Referidos)
    if (body?.action === "register") {
      const parsed = registerSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || "Datos inválidos" },
          { status: 400 }
        );
      }

      const name = sanitizeText(parsed.data.name).trim();
      const email = sanitizeText(parsed.data.email).toLowerCase().trim();
      const phone = parsed.data.phone ? sanitizeText(parsed.data.phone).trim() : null;
      const rawRef = parsed.data.referralCode
        ? sanitizeText(parsed.data.referralCode).toUpperCase().trim()
        : null;

      const existing = await prisma.clientMember.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json(
          { error: "Este correo ya tiene una cuenta CYNKO. Inicia sesión en su lugar." },
          { status: 409 }
        );
      }

      // Buscar referidor si ingresó código
      let referrer: { id: string; name: string; lifetimePoints: number } | null = null;
      if (rawRef) {
        referrer = await prisma.clientMember.findUnique({
          where: { referralCode: rawRef },
          select: { id: true, name: true, lifetimePoints: true },
        });
      }

      const passwordHash = await hashPassword(parsed.data.password);
      const welcomePoints = referrer ? 200 : 100; // +100 extra si vino invitado por un amigo

      const newClient = await prisma.$transaction(async (tx) => {
        const created = await tx.clientMember.create({
          data: {
            email,
            passwordHash,
            name,
            phone,
            cynkoCode: generateCynkoCode(),
            referralCode: generateReferralCode(name),
            referredById: referrer?.id || null,
            globalPoints: welcomePoints,
            lifetimePoints: welcomePoints,
            tier: calculateClubTier(welcomePoints),
          },
        });

        await tx.clubPointTransaction.create({
          data: {
            clientId: created.id,
            points: 100,
            type: "WELCOME",
            description: "Bono de bienvenida a CYNKO Club",
          },
        });

        if (referrer) {
          await tx.clubPointTransaction.create({
            data: {
              clientId: created.id,
              points: 100,
              type: "REFERRAL",
              description: `Bono por invitación de ${referrer.name}`,
            },
          });

          const newRefLifetime = referrer.lifetimePoints + 150;
          await tx.clientMember.update({
            where: { id: referrer.id },
            data: {
              globalPoints: { increment: 150 },
              lifetimePoints: { increment: 150 },
              tier: calculateClubTier(newRefLifetime),
            },
          });

          await tx.clubPointTransaction.create({
            data: {
              clientId: referrer.id,
              points: 150,
              type: "REFERRAL",
              description: `Invitaste a ${name} a CYNKO`,
            },
          });
        }

        return created;
      });

      const token = await signClientToken({
        sub: newClient.id,
        email: newClient.email,
        name: newClient.name,
        cynkoCode: newClient.cynkoCode,
        type: "CLIENT_MEMBER",
      });
      await setClientSessionCookie(token);

      const profile = await buildClientProfile(newClient.id);
      return NextResponse.json({
        success: true,
        client: profile,
        welcomeBonus: welcomePoints,
      });
    }

    return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  } catch (error) {
    console.error("[CLIENT_AUTH_POST_ERROR]", error);
    return NextResponse.json({ error: "Error procesando autenticación de cliente" }, { status: 500 });
  }
}
