import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";

// Cargar variables de entorno desde .env manualmente para no depender de librerías externas
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { DELETE } from "../src/app/api/v1/library/route";
import { prisma } from "../src/lib/db/prisma";
import { signSessionToken } from "../src/lib/auth/jwt";

async function runRealEndpointTests() {
  console.log("=================================================================");
  console.log("INICIANDO PRUEBAS DEL ENDPOINT REAL DELETE /api/v1/library");
  console.log("=================================================================");

  // 1. Obtener usuarios reales de prueba
  const djUser = await prisma.user.findFirst({
    where: { role: "DJ", status: "ACTIVE" },
  });

  const adminUser = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN", status: "ACTIVE" },
  });

  if (!djUser || !djUser.tenantId) {
    throw new Error("No se encontró usuario DJ activo con tenantId para la prueba.");
  }
  if (!adminUser) {
    throw new Error("No se encontró usuario SUPER_ADMIN activo para la prueba.");
  }

  console.log(`[INFO] Usuario DJ en BD: ${djUser.email} (Tenant: ${djUser.tenantId})`);
  console.log(`[INFO] Usuario Admin en BD: ${adminUser.email}`);

  // 2. Firmar tokens reales de sesión JWT
  const djToken = await signSessionToken({
    sub: djUser.id,
    email: djUser.email,
    name: djUser.name || "DJ Test",
    role: djUser.role as any,
    tenantId: djUser.tenantId,
    tokenVersion: djUser.tokenVersion,
  });

  const adminToken = await signSessionToken({
    sub: adminUser.id,
    email: adminUser.email,
    name: adminUser.name || "Admin Test",
    role: adminUser.role as any,
    tenantId: adminUser.tenantId,
    tokenVersion: adminUser.tokenVersion,
  });

  // 3. Crear canciones reales de prueba en la base de datos
  const songTenantA = await prisma.song.create({
    data: {
      title: "TEST_CANCIÓN_PROPIA_BAR_A",
      tenantId: djUser.tenantId,
      durationSeconds: 180,
    },
  });

  const otherTenantId = "tenant_seguridad_externo_999";
  const songTenantB = await prisma.song.create({
    data: {
      title: "TEST_CANCIÓN_FORÁNEA_BAR_B",
      tenantId: otherTenantId,
      durationSeconds: 200,
    },
  });

  const songGlobal = await prisma.song.create({
    data: {
      title: "TEST_CANCIÓN_CATÁLOGO_GLOBAL",
      tenantId: null, // Global
      durationSeconds: 210,
    },
  });

  console.log(`[SETUP] Canción local Bar A creada en BD (ID: ${songTenantA.id})`);
  console.log(`[SETUP] Canción foránea Bar B creada en BD (ID: ${songTenantB.id})`);
  console.log(`[SETUP] Canción global creada en BD (ID: ${songGlobal.id})`);

  try {
    // -------------------------------------------------------------
    // CASO 1: DJ de Bar A intenta borrar canción de Bar B (Cross-Tenant IDOR)
    // -------------------------------------------------------------
    const req1 = new NextRequest(`http://localhost:3000/api/v1/library?id=${songTenantB.id}`, {
      method: "DELETE",
      headers: {
        cookie: `vidjs_session=${djToken}`,
      },
    });

    const res1 = await DELETE(req1);
    const body1 = await res1.json();

    console.log("\n[TEST 1] DJ intenta borrar canción de otro tenant:");
    console.log(` -> Status HTTP: ${res1.status} (Esperado: 403)`);
    console.log(` -> Respuesta: ${JSON.stringify(body1)}`);

    const stillExistsB = await prisma.song.findUnique({ where: { id: songTenantB.id } });
    if (res1.status === 403 && stillExistsB) {
      console.log(" -> RESULTADO: PASS (Vulnerabilidad IDOR mitigada. La canción foránea NO fue borrada).");
    } else {
      throw new Error("FALLO: La canción de otro tenant fue eliminada o no devolvió 403.");
    }

    // -------------------------------------------------------------
    // CASO 2: DJ de Bar A intenta borrar canción del catálogo global
    // -------------------------------------------------------------
    const req2 = new NextRequest(`http://localhost:3000/api/v1/library?id=${songGlobal.id}`, {
      method: "DELETE",
      headers: {
        cookie: `vidjs_session=${djToken}`,
      },
    });

    const res2 = await DELETE(req2);
    const body2 = await res2.json();

    console.log("\n[TEST 2] DJ intenta borrar canción global compartida:");
    console.log(` -> Status HTTP: ${res2.status} (Esperado: 403)`);
    console.log(` -> Respuesta: ${JSON.stringify(body2)}`);

    const stillExistsGlobal = await prisma.song.findUnique({ where: { id: songGlobal.id } });
    if (res2.status === 403 && stillExistsGlobal) {
      console.log(" -> RESULTADO: PASS (Catálogo global protegido contra tenants locales).");
    } else {
      throw new Error("FALLO: La canción global fue eliminada por un tenant local.");
    }

    // -------------------------------------------------------------
    // CASO 3: DJ de Bar A borra su PROPIA canción (Mismo Tenant)
    // -------------------------------------------------------------
    const req3 = new NextRequest(`http://localhost:3000/api/v1/library?id=${songTenantA.id}`, {
      method: "DELETE",
      headers: {
        cookie: `vidjs_session=${djToken}`,
      },
    });

    const res3 = await DELETE(req3);
    const body3 = await res3.json();

    console.log("\n[TEST 3] DJ borra su propia canción del mismo tenant:");
    console.log(` -> Status HTTP: ${res3.status} (Esperado: 200)`);
    console.log(` -> Respuesta: ${JSON.stringify(body3)}`);

    const deletedA = await prisma.song.findUnique({ where: { id: songTenantA.id } });
    if (res3.status === 200 && !deletedA) {
      console.log(" -> RESULTADO: PASS (El usuario legítimo pudo borrar su propia canción).");
    } else {
      throw new Error("FALLO: La canción propia no pudo ser eliminada.");
    }

    // -------------------------------------------------------------
    // CASO 4: SUPER_ADMIN borra la canción global (Gobernanza de Plataforma)
    // -------------------------------------------------------------
    const req4 = new NextRequest(`http://localhost:3000/api/v1/library?id=${songGlobal.id}`, {
      method: "DELETE",
      headers: {
        cookie: `vidjs_session=${adminToken}`,
      },
    });

    const res4 = await DELETE(req4);
    const body4 = await res4.json();

    console.log("\n[TEST 4] SUPER_ADMIN borra canción global:");
    console.log(` -> Status HTTP: ${res4.status} (Esperado: 200)`);
    console.log(` -> Respuesta: ${JSON.stringify(body4)}`);

    const deletedGlobal = await prisma.song.findUnique({ where: { id: songGlobal.id } });
    if (res4.status === 200 && !deletedGlobal) {
      console.log(" -> RESULTADO: PASS (SUPER_ADMIN conserva permisos de administración global).");
    } else {
      throw new Error("FALLO: SUPER_ADMIN no pudo eliminar la canción global.");
    }

    console.log("\n=================================================================");
    console.log("TODAS LAS PRUEBAS SOBRE EL ENDPOINT REAL PASARON AL 100%");
    console.log("=================================================================");
  } finally {
    // 4. Limpieza garantizada de fixtures de prueba
    console.log("\n[CLEANUP] Limpiando canciones de prueba...");
    await prisma.song.deleteMany({
      where: {
        id: { in: [songTenantA.id, songTenantB.id, songGlobal.id] },
      },
    });
    console.log("[CLEANUP] Base de datos limpia de registros de prueba.");
    await prisma.$disconnect();
  }
}

runRealEndpointTests().catch((err) => {
  console.error("FATAL ERROR EN PRUEBA REAL:", err);
  process.exit(1);
});
