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
  // Tenant & Facturación & Configuración
  TENANT_READ: "tenant:read",
  TENANT_UPDATE: "tenant:update",
  TENANT_BILLING: "tenant:billing",
  SETTINGS_MANAGE: "settings:manage",
  AUDIT_READ: "audit:read",
  USERS_MANAGE: "users:manage",

  // Locales (Venues)
  VENUES_READ: "venues:read",
  VENUES_MANAGE: "venues:manage",

  // Eventos & Sesiones en Vivo
  EVENTS_READ: "events:read",
  EVENTS_MANAGE: "events:manage",
  EVENTS_CONTROL: "events:control",

  // Mesas y Códigos QR
  TABLES_READ: "tables:read",
  TABLES_MANAGE: "tables:manage",

  // Cola de Reproducción & Cabina DJ
  QUEUE_READ: "queue:read",
  QUEUE_MANAGE: "queue:manage",

  // Solicitudes de Canciones
  REQUESTS_SUBMIT: "requests:submit",
  REQUESTS_READ: "requests:read",
  REQUESTS_MODERATE: "requests:moderate",

  // Catálogo Musical & Pistas Karaoke
  CATALOG_READ: "catalog:read",
  CATALOG_MANAGE: "catalog:manage",

  // Pantalla Smart TV & Dinámicas en Vivo
  DISPLAY_STREAM: "display:stream",
  INTERACTIVE_CONTROL: "interactive:control",
  PHOTOS_MODERATE: "photos:moderate",

  // Barra & Promociones
  DEALS_MANAGE: "deals:manage",

  // Dashboard & Métricas
  DASHBOARD_READ: "dashboard:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionCategoryKey = "dj_music" | "screen_karaoke" | "venue_tables" | "admin_management";

export interface PermissionCategory {
  id: PermissionCategoryKey;
  label: string;
  description: string;
  icon: string;
}

export const PERMISSION_CATEGORIES: Record<PermissionCategoryKey, PermissionCategory> = {
  dj_music: {
    id: "dj_music",
    label: "Cabina DJ & Música",
    description: "Control de música, cola de canciones, biblioteca y reproducción en vivo",
    icon: "Headphones",
  },
  screen_karaoke: {
    id: "screen_karaoke",
    label: "Pantalla Smart TV & Karaoke",
    description: "Letras en TV, juegos interactivos de mesas y muro de fotos",
    icon: "Tv",
  },
  venue_tables: {
    id: "venue_tables",
    label: "Local, Eventos & Mesas QR",
    description: "Gestión de sucursales, apertura de eventos y códigos QR de mesas",
    icon: "Building2",
  },
  admin_management: {
    id: "admin_management",
    label: "Administración, Barra & Equipo",
    description: "Métricas del negocio, ofertas de barra, usuarios y auditoría",
    icon: "ShieldCheck",
  },
};

export interface PermissionDefinition {
  id: Permission;
  label: string;
  description: string;
  category: PermissionCategoryKey;
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // 1. Cabina DJ & Música
  {
    id: PERMISSIONS.QUEUE_READ,
    label: "Ver Cola de Canciones",
    description: "Consultar la lista de pedidos en espera y el tema sonando en vivo",
    category: "dj_music",
  },
  {
    id: PERMISSIONS.QUEUE_MANAGE,
    label: "Gestionar Cola de Reproducción",
    description: "Reordenar, pausar pedidos, adelantar o limpiar la cola de reproducción",
    category: "dj_music",
  },
  {
    id: PERMISSIONS.REQUESTS_READ,
    label: "Ver Pedidos de Comensales",
    description: "Ver las solicitudes enviadas por los comensales desde sus celulares",
    category: "dj_music",
  },
  {
    id: PERMISSIONS.REQUESTS_MODERATE,
    label: "Moderar Pedidos de Canciones",
    description: "Aprobar, rechazar o marcar pedidos como 'Al Aire / En Escenario'",
    category: "dj_music",
  },
  {
    id: PERMISSIONS.CATALOG_READ,
    label: "Consultar Catálogo Musical",
    description: "Buscar canciones y pistas en la biblioteca general del local",
    category: "dj_music",
  },
  {
    id: PERMISSIONS.CATALOG_MANAGE,
    label: "Gestionar Catálogo & Pistas",
    description: "Subir archivos de audio, vincular pistas de karaoke y editar metadatos",
    category: "dj_music",
  },
  {
    id: PERMISSIONS.EVENTS_CONTROL,
    label: "Control de Reproducción en Vivo",
    description: "Play, Pause, crossfader y sincronización con VirtualDJ y la Smart TV",
    category: "dj_music",
  },

  // 2. Pantalla Smart TV & Karaoke
  {
    id: PERMISSIONS.DISPLAY_STREAM,
    label: "Emitir en Smart TV (Display)",
    description: "Abrir la pantalla pública y controlar la visualización de vinilo o video",
    category: "screen_karaoke",
  },
  {
    id: PERMISSIONS.INTERACTIVE_CONTROL,
    label: "Juegos Interactivos en Pantalla",
    description: "Lanzar duelos musicales, aplausómetro en vivo y ruleta de premios en TV",
    category: "screen_karaoke",
  },
  {
    id: PERMISSIONS.PHOTOS_MODERATE,
    label: "Moderar Muro de Fotos en TV",
    description: "Aprobar, rechazar o eliminar fotos enviadas por los comensales para la TV",
    category: "screen_karaoke",
  },

  // 3. Local, Eventos & Mesas QR
  {
    id: PERMISSIONS.TABLES_READ,
    label: "Ver Mesas & Códigos QR",
    description: "Visualizar el listado de mesas y monitorear sesiones activas",
    category: "venue_tables",
  },
  {
    id: PERMISSIONS.TABLES_MANAGE,
    label: "Gestionar Mesas & Reset de QR",
    description: "Crear mesas, descargar PDFs de QR y resetear mesas al desocuparse",
    category: "venue_tables",
  },
  {
    id: PERMISSIONS.EVENTS_READ,
    label: "Ver Eventos & Noches",
    description: "Ver calendario de fiestas, sesiones de karaoke y eventos activos",
    category: "venue_tables",
  },
  {
    id: PERMISSIONS.EVENTS_MANAGE,
    label: "Crear & Finalizar Eventos",
    description: "Crear nuevas noches, activar eventos y cerrarlos al finalizar la fiesta",
    category: "venue_tables",
  },
  {
    id: PERMISSIONS.VENUES_READ,
    label: "Ver Información del Local",
    description: "Consultar datos de las sedes y locales físicos del establecimiento",
    category: "venue_tables",
  },
  {
    id: PERMISSIONS.VENUES_MANAGE,
    label: "Editar Sedes & Sucursales",
    description: "Modificar nombre, dirección, teléfonos y sucursales del establecimiento",
    category: "venue_tables",
  },

  // 4. Administración, Barra & Equipo
  {
    id: PERMISSIONS.DASHBOARD_READ,
    label: "Acceso al Dashboard & Métricas",
    description: "Ver métricas nocturnas, canciones más pedidas y mesas con mayor consumo",
    category: "admin_management",
  },
  {
    id: PERMISSIONS.DEALS_MANAGE,
    label: "Gestionar Promos de Barra (Flash Deals)",
    description: "Crear y activar ofertas relámpago de barra para la Smart TV y celulares",
    category: "admin_management",
  },
  {
    id: PERMISSIONS.SETTINGS_MANAGE,
    label: "Configuración General del Bar",
    description: "Editar políticas de pedidos (Fair Play), crossfader y ajustes del local",
    category: "admin_management",
  },
  {
    id: PERMISSIONS.USERS_MANAGE,
    label: "Gestionar Equipo & Asignar Roles",
    description: "Crear nuevos miembros del personal y asignar roles (Manager, DJ, Staff)",
    category: "admin_management",
  },
  {
    id: PERMISSIONS.AUDIT_READ,
    label: "Ver Registro de Auditoría",
    description: "Consultar el historial y logs de seguridad de acciones realizadas en el sistema",
    category: "admin_management",
  },
  {
    id: PERMISSIONS.TENANT_BILLING,
    label: "Facturación & Suscripción SaaS",
    description: "Gestionar el plan de suscripción, tarjetas y pagos del servicio Vidjs",
    category: "admin_management",
  },
];

export interface RoleDefinition {
  id: Role;
  name: string;
  badge: string;
  color: string;
  description: string;
  canAssign: boolean;
  isCustomizable: boolean;
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: ROLES.OWNER,
    name: "Propietario / Dueño",
    badge: "OWNER",
    color: "amber",
    description: "Acceso total sin restricciones a finanzas, configuración, sedes y personal.",
    canAssign: false,
    isCustomizable: false,
  },
  {
    id: ROLES.MANAGER,
    name: "Manager / Administrador de Sala",
    badge: "MANAGER",
    color: "purple",
    description: "Supervisión operativa completa: control de eventos, mesas, promociones de barra, moderación y reportes de la noche.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.DJ,
    name: "DJ / Operador de Cabina Musical",
    badge: "DJ",
    color: "cyan",
    description: "Control total de la música en vivo, gestión de pedidos, catálogo musical, pistas karaoke e interacción en TV.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.OPERATOR,
    name: "Operador de Pista / Staff",
    badge: "STAFF",
    color: "emerald",
    description: "Visualización de mesas y pedidos para servicio en salón y atención a comensales.",
    canAssign: true,
    isCustomizable: true,
  },
];

// Matriz predeterminada de asignación de permisos por rol
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),

  OWNER: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.TENANT_READ,
    PERMISSIONS.TENANT_UPDATE,
    PERMISSIONS.TENANT_BILLING,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.USERS_MANAGE,
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
    PERMISSIONS.INTERACTIVE_CONTROL,
    PERMISSIONS.PHOTOS_MODERATE,
    PERMISSIONS.DEALS_MANAGE,
  ],

  MANAGER: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.TENANT_READ,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.USERS_MANAGE,
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
    PERMISSIONS.INTERACTIVE_CONTROL,
    PERMISSIONS.PHOTOS_MODERATE,
    PERMISSIONS.DEALS_MANAGE,
  ],

  DJ: [
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.EVENTS_CONTROL,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.QUEUE_READ,
    PERMISSIONS.QUEUE_MANAGE,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.REQUESTS_MODERATE,
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.CATALOG_MANAGE,
    PERMISSIONS.DISPLAY_STREAM,
    PERMISSIONS.INTERACTIVE_CONTROL,
    PERMISSIONS.PHOTOS_MODERATE,
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

/**
 * Obtiene los permisos efectivos para un rol, considerando si el Tenant personalizó la matriz.
 */
export function getEffectiveRolePermissions(
  role: Role,
  customRolePermissions?: Record<string, string[]> | null
): Permission[] {
  if (role === "SUPER_ADMIN" || role === "OWNER") {
    return ROLE_PERMISSIONS[role];
  }
  if (customRolePermissions && Array.isArray(customRolePermissions[role])) {
    return customRolePermissions[role] as Permission[];
  }
  return ROLE_PERMISSIONS[role] || [];
}

/**
 * Verifica si un rol cuenta con un permiso específico.
 */
export function hasPermission(
  role: Role,
  permission: Permission,
  customRolePermissions?: Record<string, string[]> | null
): boolean {
  if (role === "SUPER_ADMIN" || role === "OWNER") return true;
  const permissions = getEffectiveRolePermissions(role, customRolePermissions);
  return permissions.includes(permission);
}

export function hasAnyPermission(
  role: Role,
  permissions: Permission[],
  customRolePermissions?: Record<string, string[]> | null
): boolean {
  return permissions.some((perm) => hasPermission(role, perm, customRolePermissions));
}

export function hasAllPermissions(
  role: Role,
  permissions: Permission[],
  customRolePermissions?: Record<string, string[]> | null
): boolean {
  return permissions.every((perm) => hasPermission(role, perm, customRolePermissions));
}
