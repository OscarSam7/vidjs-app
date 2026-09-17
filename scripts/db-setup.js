/**
 * Script de inicialización y adaptación automática de Base de Datos para Producción
 * Detecta si DATABASE_URL es PostgreSQL o SQLite y ajusta prisma/schema.prisma dinámicamente.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const schemaPath = path.join(__dirname, "..", "prisma", "schema.prisma");
const databaseUrl = process.env.DATABASE_URL || "";

console.log("\n=================================================");
console.log("🛠️  INICIALIZADOR DE BASE DE DATOS DE VIDJS");
console.log("=================================================\n");

let targetProvider = "sqlite";

if (
  databaseUrl.startsWith("postgresql://") ||
  databaseUrl.startsWith("postgres://")
) {
  targetProvider = "postgresql";
  console.log("🐘 Detectada base de datos PostgreSQL.");
} else if (databaseUrl.startsWith("mysql://")) {
  targetProvider = "mysql";
  console.log("🐬 Detectada base de datos MySQL.");
} else {
  console.log("📦 Detectada base de datos SQLite.");
}

// Leer y adaptar schema.prisma si es necesario
if (fs.existsSync(schemaPath)) {
  let schemaContent = fs.readFileSync(schemaPath, "utf-8");
  const currentProviderMatch = schemaContent.match(/provider\s*=\s*"([^"]+)"/);

  if (currentProviderMatch && currentProviderMatch[1] !== targetProvider) {
    console.log(
      `🔄 Actualizando provider de '${currentProviderMatch[1]}' a '${targetProvider}' en schema.prisma...`
    );
    schemaContent = schemaContent.replace(
      /provider\s*=\s*"[^"]+"/,
      `provider = "${targetProvider}"`
    );
    fs.writeFileSync(schemaPath, schemaContent, "utf-8");
    console.log("✅ schema.prisma actualizado exitosamente.");
  } else {
    console.log(`✅ schema.prisma ya se encuentra configurado para '${targetProvider}'.`);
  }
}

// Ejecutar prisma generate y db push
try {
  console.log("\n⚙️  Generando cliente Prisma...");
  execSync("npx prisma generate", { stdio: "inherit" });

  console.log("\n🚀 Aplicando esquema a la base de datos (db push)...");
  execSync("npx prisma db push", { stdio: "inherit" });

  console.log("\n✨ Base de datos inicializada y lista para producción.\n");
} catch (error) {
  console.error("❌ Error inicializando base de datos:", error.message);
  process.exit(1);
}
