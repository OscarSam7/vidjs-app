import { NextResponse } from "next/server";
import { requireUserSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { Role, getEffectiveRolePermissions } from "@/lib/rbac/permissions";
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
            settings: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    let customRolePermissions: Record<string, string[]> | null = null;
    if (user.tenant?.settings) {
      try {
        const parsed = JSON.parse(user.tenant.settings);
        if (parsed.rolePermissions) {
          customRolePermissions = parsed.rolePermissions;
        }
      } catch (err) {
        // ignore parse error
      }
    }

    const permissions = getEffectiveRolePermissions(user.role as Role, customRolePermissions);

    // Omit settings from client payload for security
    const { settings, ...safeTenant } = user.tenant || {};

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        status: user.status,
        tenant: user.tenant ? safeTenant : null,
        permissions,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
