import {
  ROLES,
  PERMISSIONS,
  hasPermission,
  ROLE_PERMISSIONS,
} from "../src/lib/rbac/permissions";
import { assertTenantAccess } from "../src/lib/db/prisma";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { signSessionToken, verifySessionToken } from "../src/lib/auth/jwt";

async function runVerification() {
  console.log("🧪 Iniciando pruebas de verificación de arquitectura...");

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      testsPassed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      testsFailed++;
    }
  }

  // 1. RBAC Tests
  console.log("\n1. Verificando Roles y Permisos (RBAC):");
  assert(
    hasPermission(ROLES.SUPER_ADMIN, PERMISSIONS.TENANT_BILLING),
    "SUPER_ADMIN tiene acceso a facturación global"
  );
  assert(
    hasPermission(ROLES.OWNER, PERMISSIONS.VENUES_MANAGE),
    "OWNER puede gestionar locales"
  );
  assert(
    hasPermission(ROLES.OWNER, PERMISSIONS.EVENTS_MANAGE),
    "OWNER puede gestionar eventos"
  );
  assert(
    hasPermission(ROLES.MANAGER, PERMISSIONS.EVENTS_MANAGE),
    "MANAGER puede gestionar eventos"
  );
  assert(
    !hasPermission(ROLES.MANAGER, PERMISSIONS.TENANT_BILLING),
    "MANAGER NO tiene acceso a facturación del tenant"
  );
  assert(
    hasPermission(ROLES.DJ, PERMISSIONS.QUEUE_MANAGE),
    "DJ puede gestionar la cola de canciones"
  );
  assert(
    !hasPermission(ROLES.DJ, PERMISSIONS.TABLES_MANAGE),
    "DJ NO puede modificar mesas físicas"
  );
  assert(
    hasPermission(ROLES.GUEST, PERMISSIONS.REQUESTS_SUBMIT),
    "GUEST puede enviar solicitudes de canciones"
  );
  assert(
    !hasPermission(ROLES.GUEST, PERMISSIONS.QUEUE_MANAGE),
    "GUEST NO puede reordenar la cola del DJ"
  );
  assert(
    hasPermission(ROLES.DISPLAY, PERMISSIONS.DISPLAY_STREAM),
    "DISPLAY tiene permiso de transmisión en pantalla pública"
  );

  // 2. Multi-Tenant Isolation Tests
  console.log("\n2. Verificando Aislamiento Multi-Tenant:");
  let crossTenantBlocked = false;
  try {
    assertTenantAccess("tenant_alpha_123", "tenant_beta_456");
  } catch (err: unknown) {
    crossTenantBlocked = true;
  }
  assert(
    crossTenantBlocked,
    "El acceso cruzado entre Tenant A y Tenant B es bloqueado con excepción"
  );

  let sameTenantAllowed = false;
  try {
    assertTenantAccess("tenant_alpha_123", "tenant_alpha_123");
    sameTenantAllowed = true;
  } catch {
    sameTenantAllowed = false;
  }
  assert(sameTenantAllowed, "El acceso dentro del mismo Tenant es permitido");

  let superAdminAllowed = false;
  try {
    assertTenantAccess(null, "tenant_beta_456");
    superAdminAllowed = true;
  } catch {
    superAdminAllowed = false;
  }
  assert(
    superAdminAllowed,
    "SUPER_ADMIN (tenantId = null) tiene acceso transversal autorizado"
  );

  // 3. Password Hashing Tests
  console.log("\n3. Verificando Criptografía y Contraseñas:");
  const testPassword = "SuperSecretSecure123!";
  const hash = await hashPassword(testPassword);
  assert(hash.startsWith("$2"), "El hash generado utiliza formato Bcrypt ($2a/$2b)");
  const isMatch = await verifyPassword(testPassword, hash);
  assert(isMatch, "La verificación de contraseña con Bcrypt es correcta");
  const isWrongMatch = await verifyPassword("WrongPassword!", hash);
  assert(!isWrongMatch, "Una contraseña errónea es rechazada correctamente");

  // 4. JWT Session Token Tests
  console.log("\n4. Verificando Tokens JWT de Sesión:");
  const payload = {
    sub: "user_test_999",
    email: "owner@retrobar.com",
    name: "Carlos Méndez",
    role: ROLES.OWNER,
    tenantId: "tenant_retro_123",
    tokenVersion: 1,
  };
  const token = await signSessionToken(payload);
  assert(typeof token === "string" && token.length > 50, "El token JWT fue firmado correctamente");

  const verified = await verifySessionToken(token);
  assert(
    verified !== null && verified.sub === payload.sub && verified.role === ROLES.OWNER && verified.tenantId === payload.tenantId,
    "El token JWT se decodifica y contiene los claims y tenantId correctos"
  );

  const fakeVerified = await verifySessionToken("invalid.token.here");
  assert(fakeVerified === null, "Un token JWT adulterado o inválido es rechazado de forma segura");

  // Resumen
  console.log("\n==================================================");
  console.log(`Resumen: ${testsPassed} pruebas superadas, ${testsFailed} fallidas`);
  console.log("==================================================");

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runVerification().catch((e) => {
  console.error("Error fatal en pruebas:", e);
  process.exit(1);
});
