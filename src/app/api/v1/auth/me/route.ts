import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { ROLE_PERMISSIONS, Role } from "@/lib/rbac/permissions";
import { handleApiError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await requireUserSession();

    const user = await prisma.user.findUnique({
      where: { id: session.sub },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        status: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    const permissions = ROLE_PERMISSIONS[user.role as Role] || [];

    return NextResponse.json({
      user: {
        ...user,
        permissions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
