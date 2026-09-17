export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  DJ: "DJ",
  OPERATOR: "OPERATOR",
  GUEST: "GUEST",
  DISPLAY: "DISPLAY",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  // Tenant & Facturación
  TENANT_READ: "tenant:read",
  TENANT_UPDATE: "tenant:update",
  TENANT_BILLING: "tenant:billing",
  AUDIT_READ: "audit:read",

  // Locales (Venues)
  VENUES_READ: "venues:read",
  VENUES_MANAGE: "venues:manage",

  // Eventos
  EVENTS_READ: "events:read",
  EVENTS_MANAGE: "events:manage",
  EVENTS_CONTROL: "events:control",

  // Mesas y QR
  TABLES_READ: "tables:read",
  TABLES_MANAGE: "tables:manage",

  // Cola y DJ
  QUEUE_READ: "queue:read",
  QUEUE_MANAGE: "queue:manage",

  // Solicitudes de Canciones
  REQUESTS_SUBMIT: "requests:submit",
  REQUESTS_READ: "requests:read",
  REQUESTS_MODERATE: "requests:moderate",

  // Catálogo Musical
  CATALOG_READ: "catalog:read",
  CATALOG_MANAGE: "catalog:manage",

  // Pantalla Pública
  DISPLAY_STREAM: "display:stream",

  // Dashboard Administrativo
  DASHBOARD_READ: "dashboard:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// Matriz de asignación de permisos por rol
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),

  OWNER: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.TENANT_READ,
    PERMISSIONS.TENANT_UPDATE,
    PERMISSIONS.TENANT_BILLING,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.VENUES_READ,
    PERMISSIONS.VENUES_MANAGE,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.EVENTS_CONTROL,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.QUEUE_READ,
    PERMISSIONS.QUEUE_MANAGE,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.REQUESTS_MODERATE,
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.CATALOG_MANAGE,
    PERMISSIONS.DISPLAY_STREAM,
  ],

  MANAGER: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.TENANT_READ,
    PERMISSIONS.VENUES_READ,
    PERMISSIONS.VENUES_MANAGE,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.EVENTS_CONTROL,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.QUEUE_READ,
    PERMISSIONS.QUEUE_MANAGE,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.REQUESTS_MODERATE,
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.DISPLAY_STREAM,
  ],

  DJ: [
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.EVENTS_CONTROL,
    PERMISSIONS.QUEUE_READ,
    PERMISSIONS.QUEUE_MANAGE,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.REQUESTS_MODERATE,
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.CATALOG_MANAGE,
  ],

  OPERATOR: [
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.QUEUE_READ,
  ],

  GUEST: [
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.REQUESTS_SUBMIT,
    PERMISSIONS.REQUESTS_READ,
  ],

  DISPLAY: [
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.QUEUE_READ,
    PERMISSIONS.DISPLAY_STREAM,
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return false;
  return permissions.includes(permission);
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((perm) => hasPermission(role, perm));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every((perm) => hasPermission(role, perm));
}
