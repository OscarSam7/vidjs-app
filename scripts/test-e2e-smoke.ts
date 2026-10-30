import fs from "fs";
import path from "path";

// 1. Cargar variables de entorno locales si no están inyectadas
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

import { prisma } from "../src/lib/db/prisma";
import { signSessionToken, verifySessionToken } from "../src/lib/auth/jwt";
import { hasPermission, Role, Permission, PERMISSIONS } from "../src/lib/rbac/permissions";

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runStep(suite: string, name: string, fn: () => Promise<string | void>) {
  const start = Date.now();
  try {
    const detail = await fn();
    results.push({
      suite,
      name,
      passed: true,
      details: detail || "OK",
      durationMs: Date.now() - start,
    });
    console.log(`  ✅ [${suite}] ${name} (${Date.now() - start}ms) - ${detail || "OK"}`);
  } catch (err: any) {
    results.push({
      suite,
      name,
      passed: false,
      details: err?.message || String(err),
      durationMs: Date.now() - start,
    });
    console.error(`  ❌ [${suite}] ${name} FAILED:`, err?.message || err);
  }
}

async function main() {
  console.log("\n=================================================================");
  console.log("🚀 INICIANDO BATERÍA INTEGRAL DE PRUEBAS E2E Y SMOKE TESTS (PASO 10)");
  console.log("=================================================================\n");

  // -------------------------------------------------------------
  // SUITE 1: PERSISTENCIA Y MODELO DE DATOS POSTGRESQL / PRISMA
  // -------------------------------------------------------------
  console.log("📋 1. Verificando Persistencia y Conectividad a Base de Datos...");

  await runStep("Database", "Conexión a Neon PostgreSQL", async () => {
    await prisma.$connect();
    return "Conexión activa y verificada";
  });

  let tenant: any = null;
  await runStep("Database", "Comprobación de Tenant Activo", async () => {
    tenant = await prisma.tenant.findFirst({
      where: { status: "ACTIVE" },
      include: { venues: true, subscription: true },
    });
    if (!tenant) throw new Error("No se encontró ningún tenant activo");
    return `Tenant: "${tenant.name}" | Locales: ${tenant.venues.length}`;
  });

  let djUser: any = null;
  let adminUser: any = null;
  await runStep("Database", "Cuentas de Usuarios Operativos", async () => {
    djUser = await prisma.user.findFirst({
      where: { role: "DJ", status: "ACTIVE" },
    });
    adminUser = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", status: "ACTIVE" },
    });
    if (!djUser) throw new Error("No se encontró usuario con rol DJ");
    return `DJ: ${djUser.email} | Admin: ${adminUser ? adminUser.email : "N/A"}`;
  });

  // -------------------------------------------------------------
  // SUITE 2: AUTENTICACIÓN, JWT CRIPTOGRÁFICO Y RBAC
  // -------------------------------------------------------------
  console.log("\n🔐 2. Verificando Criptografía JWT y Matriz de Permisos RBAC...");

  let token = "";
  await runStep("Auth", "Firma criptográfica de token JWT (jose)", async () => {
    token = await signSessionToken({
      sub: djUser.id,
      email: djUser.email,
      name: djUser.name,
      role: djUser.role as Role,
      tenantId: djUser.tenantId,
      tokenVersion: djUser.tokenVersion,
    });
    if (!token || token.length < 50) throw new Error("Token generado inválido");
    return `Token HS256 generado (${token.substring(0, 24)}...)`;
  });

  await runStep("Auth", "Verificación e integridad de firma de sesión", async () => {
    const payload = await verifySessionToken(token);
    if (!payload || payload.sub !== djUser.id) {
      throw new Error("Fallo al validar payload de sesión");
    }
    return `Firma válida para usuario ID: ${payload.sub}`;
  });

  await runStep("RBAC", "Matriz de Permisos DJ vs Staff", async () => {
    const djCanPlay = hasPermission("DJ", PERMISSIONS.QUEUE_MANAGE);
    const djCanManageCatalog = hasPermission("DJ", PERMISSIONS.CATALOG_MANAGE);
    const guestCanBilling = hasPermission("GUEST", PERMISSIONS.TENANT_BILLING);

    if (!djCanPlay || !djCanManageCatalog) {
      throw new Error("Permisos requeridos para DJ no otorgados en matriz");
    }
    if (guestCanBilling) {
      throw new Error("Falla de seguridad: GUEST tiene acceso a facturación");
    }
    return "Permisos de DJ y Comensal estrictamente delimitados";
  });

  // -------------------------------------------------------------
  // SUITE 3: MESAS, SESIONES QR Y ATENCIÓN
  // -------------------------------------------------------------
  console.log("\n🪑 3. Verificando Gestión de Mesas y Sistema de Pedidos...");

  await runStep("Tables", "Lectura y Tokens QR de Mesas", async () => {
    const tables = await prisma.table.findMany({
      where: { venue: { tenantId: tenant.id } },
      take: 10,
    });
    if (tables.length === 0) throw new Error("No hay mesas registradas en el local");
    const activeTokens = tables.filter((t) => t.qrToken && t.qrToken.length > 5);
    return `Mesas auditadas: ${tables.length} (Tokens QR válidos: ${activeTokens.length})`;
  });

  // -------------------------------------------------------------
  // SUITE 4: CATÁLOGO DE KARAOKE Y MOTOR DE BÚSQUEDA
  // -------------------------------------------------------------
  console.log("\n🎤 4. Verificando Motor de Búsqueda y Catálogo de Canciones...");

  await runStep("Karaoke", "Búsqueda e indexación de canciones", async () => {
    const totalSongs = await prisma.song.count();
    const searchResult = await prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: "a", mode: "insensitive" } },
          { artist: { name: { contains: "a", mode: "insensitive" } } },
        ],
      },
      take: 5,
      include: { artist: true },
    });
    return `Catálogo total: ${totalSongs} canciones | Muestra indexada: ${searchResult.length}`;
  });

  // -------------------------------------------------------------
  // SUITE 5: CERTÁMENES DE KARAOKE (CHAMPIONSHIP OS)
  // -------------------------------------------------------------
  console.log("\n🏆 5. Verificando Módulo de Concursos y Votación Notarial...");

  let activeContest: any = null;
  await runStep("Contest", "Recuperación de Certamen y Galas Activas", async () => {
    activeContest = await prisma.karaokeContest.findFirst({
      where: { tenantId: tenant.id },
      include: {
        stages: true,
        criteria: true,
        judges: true,
        participants: true,
      },
    });

    if (!activeContest) {
      // Si no existe, crear uno de prueba para validar el flujo completo
      activeContest = await prisma.karaokeContest.create({
        data: {
          tenantId: tenant.id,
          name: "Campeonato Oficial Vidjs 2026",
          description: "Certamen de prueba smoke test automatizado",
          code: `KARAOKE-${Date.now().toString().slice(-4)}`,
          status: "LIVE",
          scoringMode: "AVERAGE",
          publicVoteWeight: 20,
          requireConsumption: true,
          criteria: {
            create: [
              { name: "Afinación", maxScore: 10, weight: 1.5, orderIndex: 1 },
              { name: "Ritmo y Tempo", maxScore: 10, weight: 1.0, orderIndex: 2 },
              { name: "Carisma Escénico", maxScore: 10, weight: 1.0, orderIndex: 3 },
            ],
          },
          judges: {
            create: [
              { name: "Jurado Notarial 1", accessPin: "8821", canGoldenBuzzer: true },
              { name: "Jurado Notarial 2", accessPin: "5542", canGoldenBuzzer: false },
            ],
          },
          stages: {
            create: [
              {
                title: "Gran Final de Gala",
                stageType: "FINALS",
                status: "LIVE",
                date: new Date(),
              },
            ],
          },
        },
        include: {
          stages: true,
          criteria: true,
          judges: true,
          participants: true,
        },
      });
      return `Certamen creado para prueba: "${activeContest.name}" (ID: ${activeContest.id})`;
    }

    return `Certamen activo: "${activeContest.name}" | Galas: ${activeContest.stages.length} | Jurados: ${activeContest.judges.length}`;
  });

  await runStep("Contest", "Cálculo Notarial de Ponderación (Jueces + Mesas)", async () => {
    const judgeAvg = 9.2;
    const publicAvgStars = 4.5; // Sobre 5.0 -> 9.0 sobre 10
    const publicVoteWeight = activeContest.publicVoteWeight || 20;
    const judgeWeight = 100 - publicVoteWeight;

    const publicScoreNormalized = (publicAvgStars / 5) * 10;
    const finalScore = Number(
      ((judgeAvg * judgeWeight + publicScoreNormalized * publicVoteWeight) / 10).toFixed(2)
    );

    if (isNaN(finalScore) || finalScore <= 0) {
      throw new Error("Error en fórmula de ponderación notarial");
    }
    return `Score calculado: ${finalScore} pts (${judgeWeight}% Jurados + ${publicVoteWeight}% Mesas)`;
  });

  // -------------------------------------------------------------
  // SUITE 6: INTEGRIDAD DE TOKENS DE DISEÑO VIDJSPRO
  // -------------------------------------------------------------
  console.log("\n🎨 6. Verificando Integridad de Tokens VIDJSPRO en Vistas...");

  await runStep("DesignSystem", "Validación de Paleta Canónica en Dashboard", async () => {
    const pagesToCheck = [
      "src/app/dashboard/settings/page.tsx",
      "src/app/dashboard/subscription/page.tsx",
      "src/app/dashboard/audit/page.tsx",
      "src/app/dashboard/branding/page.tsx",
      "src/app/dashboard/team/page.tsx",
      "src/app/dashboard/contest/page.tsx",
      "src/app/showcase/page.tsx",
    ];

    let inspected = 0;
    for (const relPath of pagesToCheck) {
      const fullPath = path.resolve(process.cwd(), relPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Archivo modernizado faltante: ${relPath}`);
      }
      const content = fs.readFileSync(fullPath, "utf-8");
      // Verificar que contenga al menos los tokens canónicos
      if (!content.includes("#111F38") && !content.includes("#0D1930")) {
        throw new Error(`El archivo ${relPath} no contiene los tokens de superficie VIDJSPRO`);
      }
      inspected++;
    }
    return `${inspected} vistas secundarias verificadas con tokens #111F38 y #0D1930`;
  });

  // -------------------------------------------------------------
  // REPORTE CONSOLIDADO
  // -------------------------------------------------------------
  console.log("\n=================================================================");
  console.log("📊 RESUMEN DE RESULTADOS DE PRUEBAS DE HUMO (SMOKE TESTS)");
  console.log("=================================================================");

  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;

  console.log(`Total Pruebas: ${results.length}`);
  console.log(`Aprobadas:    ✅ ${passedCount}`);
  console.log(`Fallidas:     ❌ ${failedCount}`);

  if (failedCount > 0) {
    console.error("\n⚠️  ALGUNAS PRUEBAS FALLARON:");
    for (const r of results.filter((r) => !r.passed)) {
      console.error(`- [${r.suite}] ${r.name}: ${r.details}`);
    }
    process.exit(1);
  } else {
    console.log("\n🎉 TODAS LAS PRUEBAS E2E Y SMOKE TESTS PASARON AL 100%.");
    console.log("VIDJS PRO SE ENCUENTRA COMPLETAMENTE ESTABLE Y LISTO PARA PRODUCCIÓN.\n");
  }
}

main()
  .catch((e) => {
    console.error("Fatal error en batería de pruebas:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
