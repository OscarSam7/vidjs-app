/**
 * Test Suite: Preparación para Despliegue en la Nube & Docker (Cloud Readiness)
 * Valida:
 * 1. Endpoint en caliente GET /api/v1/health (HTTP 200, status healthy, DB latency, uptime, RAM)
 * 2. Multi-Stage Dockerfile (deps, builder, runner, usuario no-root, HEALTHCHECK)
 * 3. Orquestación docker-compose.yml (servicios app y db, volumen postgres_data, depends_on healthy)
 * 4. Archivo .dockerignore (exclusión de node_modules, .next, .env)
 * 5. Plantilla .env.example (variables completas y documentadas)
 * 6. Configuración next.config.ts (output: "standalone")
 */

import fs from "fs";
import path from "path";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failed++;
  }
}

async function runCloudReadinessTests() {
  console.log("\n=================================================================");
  console.log("☁️  INICIANDO TEST SUITE: CLOUD & DOCKER PRODUCTION READINESS");
  console.log("=================================================================\n");

  const projectRoot = path.join(__dirname, "..");

  // -------------------------------------------------------------
  // 1. Validar Endpoint de Salud en Caliente (/api/v1/health)
  // -------------------------------------------------------------
  console.log("🩺 1. Validando Endpoint de Monitoreo /api/v1/health...");

  const healthRes = await fetch(`${BASE_URL}/api/v1/health`);
  assert(healthRes.ok, "GET /api/v1/health responde HTTP 200 OK");

  const health = await healthRes.json();
  assert(health.status === "healthy", `Estado del servicio es 'healthy' (${health.status})`);
  assert(health.database?.status === "connected", "Conexión activa con la base de datos confirmada");
  assert(typeof health.database?.latencyMs === "number", `Latencia de base de datos reportada (${health.database?.latencyMs} ms)`);
  assert(typeof health.uptimeSeconds === "number" && health.uptimeSeconds >= 0, `Tiempo activo reportado (${health.uptimeSeconds}s)`);
  assert(typeof health.memory?.heapUsedMb === "number" && health.memory.heapUsedMb > 0, `Métricas de memoria RAM reportadas (${health.memory?.heapUsedMb} MB heap)`);
  assert(health.service === "vidjs-night-experience-os", `Nombre de servicio coincide: '${health.service}'`);
  assert(Boolean(health.timestamp), `Timestamp del chequeo: ${health.timestamp}`);

  // -------------------------------------------------------------
  // 2. Validar Dockerfile Multi-Etapa
  // -------------------------------------------------------------
  console.log("\n🐳 2. Validando Estructura de Dockerfile Multi-Etapa...");

  const dockerfilePath = path.join(projectRoot, "Dockerfile");
  assert(fs.existsSync(dockerfilePath), "Archivo Dockerfile presente en la raíz del proyecto");

  const dockerfile = fs.readFileSync(dockerfilePath, "utf-8");
  assert(dockerfile.includes("FROM node:20-alpine AS base"), "Utiliza imagen base ligera node:20-alpine");
  assert(dockerfile.includes("libc6-compat"), "Instala libc6-compat para compatibilidad con Prisma en Alpine");
  assert(dockerfile.includes("FROM base AS deps"), "Etapa 1 'deps' declarada correctamente");
  assert(dockerfile.includes("FROM base AS builder"), "Etapa 2 'builder' declarada correctamente");
  assert(dockerfile.includes("FROM base AS runner"), "Etapa 3 'runner' declarada correctamente");
  assert(dockerfile.includes("USER nextjs"), "Configura usuario no-root 'nextjs' por seguridad");
  assert(dockerfile.includes("HEALTHCHECK"), "Directiva HEALTHCHECK configurada apuntando a /api/v1/health");
  assert(dockerfile.includes(".next/standalone"), "Copia artefactos standalone de Next.js");
  assert(dockerfile.includes('CMD ["node", "server.js"]'), "Comando de inicio es 'node server.js'");

  // -------------------------------------------------------------
  // 3. Validar docker-compose.yml
  // -------------------------------------------------------------
  console.log("\n📦 3. Validando Orquestación docker-compose.yml...");

  const composePath = path.join(projectRoot, "docker-compose.yml");
  assert(fs.existsSync(composePath), "Archivo docker-compose.yml presente en la raíz");

  const compose = fs.readFileSync(composePath, "utf-8");
  assert(compose.includes("container_name: vidjs_app"), "Servicio 'app' definido para la aplicación Vidjs");
  assert(compose.includes("container_name: vidjs_db"), "Servicio 'db' definido para PostgreSQL");
  assert(compose.includes("postgres:16-alpine"), "Utiliza PostgreSQL 16 Alpine");
  assert(compose.includes("postgres_data:"), "Volumen persistente 'postgres_data' declarado");
  assert(compose.includes("service_healthy"), "La app espera a que PostgreSQL pase el healthcheck (service_healthy)");
  assert(compose.includes("3000:3000"), "Mapeo de puerto 3000 configurado");
  assert(compose.includes("pg_isready"), "Healthcheck de PostgreSQL utiliza 'pg_isready'");

  // -------------------------------------------------------------
  // 4. Validar .dockerignore
  // -------------------------------------------------------------
  console.log("\n🚫 4. Validando Exclusiones en .dockerignore...");

  const dockerignorePath = path.join(projectRoot, ".dockerignore");
  assert(fs.existsSync(dockerignorePath), "Archivo .dockerignore presente en la raíz");

  const dockerignore = fs.readFileSync(dockerignorePath, "utf-8");
  assert(dockerignore.includes("node_modules"), "Excluye 'node_modules' del contexto de build");
  assert(dockerignore.includes(".next"), "Excluye directorio local '.next'");
  assert(dockerignore.includes(".env"), "Excluye variables de entorno y secretos locales");
  assert(dockerignore.includes(".git"), "Excluye historial de git");

  // -------------------------------------------------------------
  // 5. Validar .env.example
  // -------------------------------------------------------------
  console.log("\n🔐 5. Validando Plantilla de Variables .env.example...");

  const envExamplePath = path.join(projectRoot, ".env.example");
  assert(fs.existsSync(envExamplePath), "Archivo .env.example presente en la raíz");

  const envExample = fs.readFileSync(envExamplePath, "utf-8");
  assert(envExample.includes("DATABASE_URL="), "Documenta DATABASE_URL");
  assert(envExample.includes("JWT_SECRET="), "Documenta JWT_SECRET");
  assert(envExample.includes("NEXTAUTH_URL="), "Documenta NEXTAUTH_URL");
  assert(envExample.includes("NODE_ENV="), "Documenta NODE_ENV");

  // -------------------------------------------------------------
  // 6. Validar next.config.ts (output: standalone)
  // -------------------------------------------------------------
  console.log("\n⚡ 6. Validando Modo Standalone en next.config.ts...");

  const nextConfigPath = path.join(projectRoot, "next.config.ts");
  const nextConfig = fs.readFileSync(nextConfigPath, "utf-8");
  assert(
    nextConfig.includes('"standalone"'),
    "next.config.ts incluye soporte para compilación standalone"
  );

  // -------------------------------------------------------------
  // Resumen Final
  // -------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`🏁 RESULTADO FINAL: ${passed}/${passed + failed} pruebas pasadas (${Math.round((passed / (passed + failed)) * 100)}%)`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runCloudReadinessTests().catch((err) => {
  console.error("Error fatal en suite de pruebas Cloud Readiness:", err);
  process.exit(1);
});
