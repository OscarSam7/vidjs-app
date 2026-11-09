export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  OWNER: "OWNER",
  MANAGER: "MANAGER",
  DJ: "DJ",
  OPERATOR: "OPERATOR",
  GUEST: "GUEST",
  DISPLAY: "DISPLAY",
  // Roles de Acreditaciones & Control de Acceso
  EVENT_ADMIN: "EVENT_ADMIN",
  SUPERVISOR: "SUPERVISOR",
  ACREDITADOR: "ACREDITADOR",
  SCANNER: "SCANNER",
  REPORTES: "REPORTES",
  // Roles de Gestión Gastronómica (Fase 14)
  ADMINISTRADOR: "ADMINISTRADOR",
  GERENTE: "GERENTE",
  CAJERO: "CAJERO",
  ENCARGADO_BARRA: "ENCARGADO_BARRA",
  OPERADOR_BARRA: "OPERADOR_BARRA",
  ENCARGADO_COCINA: "ENCARGADO_COCINA",
  COCINERO: "COCINERO",
  MOZO: "MOZO",
  AUDITOR: "AUDITOR",
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

  // Acreditaciones & Control de Acceso para Eventos
  ACCREDITATIONS_READ: "accreditations:read",
  ACCREDITATIONS_MANAGE: "accreditations:manage",
  ACCREDITATIONS_CHECKIN: "accreditations:checkin",
  ACCREDITATIONS_PRINT: "accreditations:print",
  ACCREDITATIONS_REPORTS: "accreditations:reports",

  // Gestión Gastronómica Integral (Fases 1 a 16)
  GASTRO_DASHBOARD_READ: "gastro:dashboard:read",
  GASTRO_ORDERS_READ: "gastro:orders:read",
  GASTRO_ORDERS_MANAGE: "gastro:orders:manage",
  GASTRO_MENU_READ: "gastro:menu:read",
  GASTRO_MENU_MANAGE: "gastro:menu:manage",
  GASTRO_PRICES_MANAGE: "gastro:prices:manage",
  GASTRO_DISCOUNTS_AUTHORIZE: "gastro:discounts:authorize",
  GASTRO_TABLES_READ: "gastro:tables:read",
  GASTRO_TABLES_MANAGE: "gastro:tables:manage",
  GASTRO_BAR_OPERATE: "gastro:bar:operate",
  GASTRO_BAR_MANAGE: "gastro:bar:manage",
  GASTRO_KITCHEN_OPERATE: "gastro:kitchen:operate",
  GASTRO_KITCHEN_MANAGE: "gastro:kitchen:manage",
  GASTRO_WAITERS_OPERATE: "gastro:waiters:operate",
  GASTRO_WAITERS_MANAGE: "gastro:waiters:manage",
  GASTRO_CASHIER_OPERATE: "gastro:cashier:operate",
  GASTRO_PAYMENTS_MANAGE: "gastro:payments:manage",
  GASTRO_DEPOSITS_MANAGE: "gastro:deposits:manage",
  GASTRO_INVENTORY_READ: "gastro:inventory:read",
  GASTRO_INVENTORY_MANAGE: "gastro:inventory:manage",
  GASTRO_INVOICING_READ: "gastro:invoicing:read",
  GASTRO_INVOICING_MANAGE: "gastro:invoicing:manage",
  GASTRO_REPORTS_READ: "gastro:reports:read",
  GASTRO_SETTINGS_MANAGE: "gastro:settings:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionCategoryKey =
  | "dj_music"
  | "screen_karaoke"
  | "venue_tables"
  | "admin_management"
  | "accreditations"
  | "gastronomy";

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
  accreditations: {
    id: "accreditations",
    label: "Acreditaciones & Control de Acceso",
    description: "Gestión de participantes, credenciales, escáner QR de ingreso y control de puertas",
    icon: "QrCode",
  },
  gastronomy: {
    id: "gastronomy",
    label: "Gestión Gastronómica & POS",
    description: "Pedidos QR, Menú Digital, KDS Barra y Cocina, Mozos, Caja, Pagos, Inventario y Facturación",
    icon: "UtensilsCrossed",
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

  // 5. Acreditaciones & Control de Acceso
  {
    id: PERMISSIONS.ACCREDITATIONS_READ,
    label: "Consultar Acreditaciones & Participantes",
    description: "Ver participantes, credenciales y estados de acreditación del evento",
    category: "accreditations",
  },
  {
    id: PERMISSIONS.ACCREDITATIONS_MANAGE,
    label: "Gestionar Acreditaciones & Categorías",
    description: "Crear, editar, importar participantes, definir tipos de credencial y asignar accesos",
    category: "accreditations",
  },
  {
    id: PERMISSIONS.ACCREDITATIONS_CHECKIN,
    label: "Operar Escáner QR de Ingreso",
    description: "Validar códigos QR y registrar accesos en puertas y sectores",
    category: "accreditations",
  },
  {
    id: PERMISSIONS.ACCREDITATIONS_PRINT,
    label: "Impresión de Credenciales & Gafetes",
    description: "Imprimir y reimprimir credenciales individuales o masivas con registro de auditoría",
    category: "accreditations",
  },
  {
    id: PERMISSIONS.ACCREDITATIONS_REPORTS,
    label: "Reportes de Acceso & Aforo",
    description: "Consultar estadísticas de ingreso en tiempo real, exportar planillas de presentismo",
    category: "accreditations",
  },

  // 6. Gestión Gastronómica & POS Integral
  {
    id: PERMISSIONS.GASTRO_DASHBOARD_READ,
    label: "Ver Dashboard Gastronómico",
    description: "Acceso a KPIs de pedidos del día, ventas de barra/cocina, señas y saldos pendientes",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_ORDERS_READ,
    label: "Consultar Pedidos Gastronómicos",
    description: "Ver pedidos activos e historial de pedidos por mesa y sector",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_ORDERS_MANAGE,
    label: "Gestionar & Cancelar Pedidos",
    description: "Crear pedidos manuales, modificar prioridades o anular pedidos con registro de auditoría",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_MENU_READ,
    label: "Consultar Menú Digital & Productos",
    description: "Visualizar categorías, productos, recetas y disponibilidad del menú",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_MENU_MANAGE,
    label: "Administrar Categorías & Productos",
    description: "Crear y editar categorías, productos, fotos, presentaciones y adicionales",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_PRICES_MANAGE,
    label: "Modificar Precios & Costos",
    description: "Autorización exclusiva para cambiar precios de venta y costos (restringido para Barra/Cocina)",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_DISCOUNTS_AUTHORIZE,
    label: "Autorizar Descuentos & Cortesías",
    description: "Aplicar o autorizar descuentos comerciales en cuentas y pedidos",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_TABLES_READ,
    label: "Ver Plano de Mesas & Sectores",
    description: "Visualizar estado de mesas, sesiones de consumo y cuentas activas",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_TABLES_MANAGE,
    label: "Gestionar Mesas, Transferencias & Cuentas",
    description: "Crear sectores, transferir pedidos entre mesas, unificar y dividir cuentas",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_BAR_OPERATE,
    label: "Operar Panel de Barra (KDS)",
    description: "Preparar bebidas, cambiar estados de barra, marcar agotados y solicitar mozo o retiro",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_BAR_MANAGE,
    label: "Administrar Barra & Modalidad de Entrega",
    description: "Activar/desactivar retiro en barra o entrega por mozo y supervisar stock de barra",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_KITCHEN_OPERATE,
    label: "Operar Panel de Cocina (KDS)",
    description: "Confirmar recepción de comidas, gestionar preparación, solicitar mozo y reportar faltantes",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_KITCHEN_MANAGE,
    label: "Administrar Cocina & Recetas",
    description: "Supervisar comandas gastronómicas, disponibilidad de platos e ingredientes de cocina",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_WAITERS_OPERATE,
    label: "Operar App de Mozos",
    description: "Aceptar pedidos listos de barra/cocina, retirar y confirmar entrega en mesa",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_WAITERS_MANAGE,
    label: "Supervisar & Asignar Mozos",
    description: "Asignación manual/automática de pedidos a mozos y control de tiempos de entrega",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_CASHIER_OPERATE,
    label: "Operar Caja Gastronómica",
    description: "Cobrar pedidos en efectivo/POS/QR, abrir y cerrar turnos de caja y emitir comprobantes",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_PAYMENTS_MANAGE,
    label: "Gestionar Pagos Digitales & Reembolsos",
    description: "Administrar transacciones QR/PIX/Transferencias, conciliar webhooks y procesar reembolsos",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_DEPOSITS_MANAGE,
    label: "Gestionar Señas & Saldos de Reserva",
    description: "Registrar señas por porcentaje o monto fijo y aplicarlas al consumo final",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_INVENTORY_READ,
    label: "Consultar Existencias de Inventario",
    description: "Ver stock actual, mínimos e insumos de barra y cocina",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_INVENTORY_MANAGE,
    label: "Control de Inventario & Reposiciones",
    description: "Registrar reposiciones, ajustar stock, configurar recetas y gestionar alertas de agotados",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_INVOICING_READ,
    label: "Ver Ventas Pendientes de Facturación",
    description: "Consultar la bandeja central de ventas cobradas e historial de facturación",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_INVOICING_MANAGE,
    label: "Facturar Ventas & Integración ERP",
    description: "Ejecutar facturación individual o agrupada, reintentar envíos y conciliar con el sistema principal",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_REPORTS_READ,
    label: "Reportes Gastronómicos & Exportación",
    description: "Consultar y exportar reportes de ventas por turno, sector, mozo, cajero, barra y cocina",
    category: "gastronomy",
  },
  {
    id: PERMISSIONS.GASTRO_SETTINGS_MANAGE,
    label: "Configuración Gastronómica",
    description: "Configurar reglas de entrega, pasarelas QR, integración administrativa y parámetros operativos",
    category: "gastronomy",
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
    id: ROLES.ADMINISTRADOR,
    name: "Administrador General",
    badge: "ADMIN",
    color: "amber",
    description: "Puede configurar todos los módulos gastronómicos, precios, descuentos, facturación y usuarios.",
    canAssign: true,
    isCustomizable: false,
  },
  {
    id: ROLES.GERENTE,
    name: "Gerente Gastronómico",
    badge: "GERENTE",
    color: "purple",
    description: "Dirección operativa del local, supervisión de ventas, caja, inventario, señas, reportes y facturación.",
    canAssign: true,
    isCustomizable: true,
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
    id: ROLES.CAJERO,
    name: "Cajero Gastronómico",
    badge: "CAJERO",
    color: "emerald",
    description: "Puede confirmar pagos en efectivo/tarjeta/QR, gestionar señas, consultar cuentas y realizar cierres de caja.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.ENCARGADO_BARRA,
    name: "Encargado de Barra",
    badge: "JEFE BARRA",
    color: "cyan",
    description: "Administra pedidos de barra, disponibilidad de bebidas, reposición de stock y modalidad de entrega (retiro/mozo).",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.OPERADOR_BARRA,
    name: "Operador de Barra / Bartender",
    badge: "BARRA",
    color: "cyan",
    description: "Recibe y prepara pedidos de bebidas en tiempo real, cambia estados y marca productos agotados sin modificar precios.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.ENCARGADO_COCINA,
    name: "Encargado de Cocina / Chef",
    badge: "JEFE COCINA",
    color: "rose",
    description: "Administra comandas gastronómicas, disponibilidad de platos, control de ingredientes y solicitud de mozos.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.COCINERO,
    name: "Cocinero / Operador de Cocina",
    badge: "COCINA",
    color: "rose",
    description: "Visualiza y prepara pedidos de alimentos, marca pedidos preparados y solicita mozo para entrega.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.MOZO,
    name: "Mozo / Camarero de Salón",
    badge: "MOZO",
    color: "indigo",
    description: "Visualiza pedidos listos de barra y cocina en su celular, acepta asignaciones, retira y confirma entregas en mesa.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.AUDITOR,
    name: "Auditor Gastronómico & Fiscal",
    badge: "AUDITOR",
    color: "slate",
    description: "Acceso de lectura y fiscalización a historial de pedidos, cierres de caja, logs de auditoría, inventario y facturación.",
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
  {
    id: ROLES.EVENT_ADMIN,
    name: "Administrador de Evento",
    badge: "EVENT_ADMIN",
    color: "blue",
    description: "Gestión completa de eventos, categorías, participantes, acreditaciones y configuración de accesos.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.SUPERVISOR,
    name: "Supervisor Operativo & Accesos",
    badge: "SUPERVISOR",
    color: "indigo",
    description: "Supervisión de salón, mesas, estados de pedidos, puertas y resolución de incidencias.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.ACREDITADOR,
    name: "Personal de Acreditación",
    badge: "ACREDITADOR",
    color: "teal",
    description: "Registro de participantes, entrega física e impresión de credenciales en mesas de acreditación.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.SCANNER,
    name: "Operador de Escáner / Portería",
    badge: "SCANNER",
    color: "rose",
    description: "Validación de códigos QR en puntos de acceso, puertas y sectores autorizados.",
    canAssign: true,
    isCustomizable: true,
  },
  {
    id: ROLES.REPORTES,
    name: "Consultor de Reportes",
    badge: "REPORTES",
    color: "slate",
    description: "Consulta de estadísticas, aforos y métricas sin permisos de modificación de datos.",
    canAssign: true,
    isCustomizable: true,
  },
];

// Matriz predeterminada de asignación de permisos por rol
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS),

  OWNER: Object.values(PERMISSIONS),

  ADMINISTRADOR: Object.values(PERMISSIONS),

  GERENTE: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.TENANT_READ,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.USERS_MANAGE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.VENUES_READ,
    PERMISSIONS.VENUES_MANAGE,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.TABLES_MANAGE,
    PERMISSIONS.DEALS_MANAGE,
    PERMISSIONS.GASTRO_DASHBOARD_READ,
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_ORDERS_MANAGE,
    PERMISSIONS.GASTRO_MENU_READ,
    PERMISSIONS.GASTRO_MENU_MANAGE,
    PERMISSIONS.GASTRO_PRICES_MANAGE,
    PERMISSIONS.GASTRO_DISCOUNTS_AUTHORIZE,
    PERMISSIONS.GASTRO_TABLES_READ,
    PERMISSIONS.GASTRO_TABLES_MANAGE,
    PERMISSIONS.GASTRO_BAR_OPERATE,
    PERMISSIONS.GASTRO_BAR_MANAGE,
    PERMISSIONS.GASTRO_KITCHEN_OPERATE,
    PERMISSIONS.GASTRO_KITCHEN_MANAGE,
    PERMISSIONS.GASTRO_WAITERS_OPERATE,
    PERMISSIONS.GASTRO_WAITERS_MANAGE,
    PERMISSIONS.GASTRO_CASHIER_OPERATE,
    PERMISSIONS.GASTRO_PAYMENTS_MANAGE,
    PERMISSIONS.GASTRO_DEPOSITS_MANAGE,
    PERMISSIONS.GASTRO_INVENTORY_READ,
    PERMISSIONS.GASTRO_INVENTORY_MANAGE,
    PERMISSIONS.GASTRO_INVOICING_READ,
    PERMISSIONS.GASTRO_INVOICING_MANAGE,
    PERMISSIONS.GASTRO_REPORTS_READ,
    PERMISSIONS.GASTRO_SETTINGS_MANAGE,
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
    PERMISSIONS.ACCREDITATIONS_READ,
    PERMISSIONS.ACCREDITATIONS_MANAGE,
    PERMISSIONS.ACCREDITATIONS_CHECKIN,
    PERMISSIONS.ACCREDITATIONS_PRINT,
    PERMISSIONS.ACCREDITATIONS_REPORTS,
    PERMISSIONS.GASTRO_DASHBOARD_READ,
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_ORDERS_MANAGE,
    PERMISSIONS.GASTRO_MENU_READ,
    PERMISSIONS.GASTRO_MENU_MANAGE,
    PERMISSIONS.GASTRO_PRICES_MANAGE,
    PERMISSIONS.GASTRO_DISCOUNTS_AUTHORIZE,
    PERMISSIONS.GASTRO_TABLES_READ,
    PERMISSIONS.GASTRO_TABLES_MANAGE,
    PERMISSIONS.GASTRO_BAR_OPERATE,
    PERMISSIONS.GASTRO_BAR_MANAGE,
    PERMISSIONS.GASTRO_KITCHEN_OPERATE,
    PERMISSIONS.GASTRO_KITCHEN_MANAGE,
    PERMISSIONS.GASTRO_WAITERS_OPERATE,
    PERMISSIONS.GASTRO_WAITERS_MANAGE,
    PERMISSIONS.GASTRO_CASHIER_OPERATE,
    PERMISSIONS.GASTRO_PAYMENTS_MANAGE,
    PERMISSIONS.GASTRO_DEPOSITS_MANAGE,
    PERMISSIONS.GASTRO_INVENTORY_READ,
    PERMISSIONS.GASTRO_INVENTORY_MANAGE,
    PERMISSIONS.GASTRO_INVOICING_READ,
    PERMISSIONS.GASTRO_INVOICING_MANAGE,
    PERMISSIONS.GASTRO_REPORTS_READ,
    PERMISSIONS.GASTRO_SETTINGS_MANAGE,
  ],

  CAJERO: [
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.GASTRO_DASHBOARD_READ,
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_MENU_READ,
    PERMISSIONS.GASTRO_TABLES_READ,
    PERMISSIONS.GASTRO_TABLES_MANAGE,
    PERMISSIONS.GASTRO_CASHIER_OPERATE,
    PERMISSIONS.GASTRO_PAYMENTS_MANAGE,
    PERMISSIONS.GASTRO_DEPOSITS_MANAGE,
    PERMISSIONS.GASTRO_INVOICING_READ,
    PERMISSIONS.GASTRO_INVOICING_MANAGE,
    PERMISSIONS.GASTRO_REPORTS_READ,
  ],

  ENCARGADO_BARRA: [
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.GASTRO_DASHBOARD_READ,
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_MENU_READ,
    PERMISSIONS.GASTRO_TABLES_READ,
    PERMISSIONS.GASTRO_BAR_OPERATE,
    PERMISSIONS.GASTRO_BAR_MANAGE,
    PERMISSIONS.GASTRO_INVENTORY_READ,
    PERMISSIONS.GASTRO_INVENTORY_MANAGE,
  ],

  OPERADOR_BARRA: [
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_MENU_READ,
    PERMISSIONS.GASTRO_TABLES_READ,
    PERMISSIONS.GASTRO_BAR_OPERATE,
    PERMISSIONS.GASTRO_INVENTORY_READ,
  ],

  ENCARGADO_COCINA: [
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.GASTRO_DASHBOARD_READ,
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_MENU_READ,
    PERMISSIONS.GASTRO_TABLES_READ,
    PERMISSIONS.GASTRO_KITCHEN_OPERATE,
    PERMISSIONS.GASTRO_KITCHEN_MANAGE,
    PERMISSIONS.GASTRO_INVENTORY_READ,
    PERMISSIONS.GASTRO_INVENTORY_MANAGE,
  ],

  COCINERO: [
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_MENU_READ,
    PERMISSIONS.GASTRO_TABLES_READ,
    PERMISSIONS.GASTRO_KITCHEN_OPERATE,
    PERMISSIONS.GASTRO_INVENTORY_READ,
  ],

  MOZO: [
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_MENU_READ,
    PERMISSIONS.GASTRO_TABLES_READ,
    PERMISSIONS.GASTRO_WAITERS_OPERATE,
  ],

  AUDITOR: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.ACCREDITATIONS_READ,
    PERMISSIONS.ACCREDITATIONS_REPORTS,
    PERMISSIONS.GASTRO_DASHBOARD_READ,
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_MENU_READ,
    PERMISSIONS.GASTRO_TABLES_READ,
    PERMISSIONS.GASTRO_INVENTORY_READ,
    PERMISSIONS.GASTRO_INVOICING_READ,
    PERMISSIONS.GASTRO_REPORTS_READ,
  ],

  EVENT_ADMIN: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.EVENTS_MANAGE,
    PERMISSIONS.ACCREDITATIONS_READ,
    PERMISSIONS.ACCREDITATIONS_MANAGE,
    PERMISSIONS.ACCREDITATIONS_CHECKIN,
    PERMISSIONS.ACCREDITATIONS_PRINT,
    PERMISSIONS.ACCREDITATIONS_REPORTS,
    PERMISSIONS.TABLES_READ,
  ],

  SUPERVISOR: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.ACCREDITATIONS_READ,
    PERMISSIONS.ACCREDITATIONS_CHECKIN,
    PERMISSIONS.ACCREDITATIONS_PRINT,
    PERMISSIONS.ACCREDITATIONS_REPORTS,
    PERMISSIONS.GASTRO_DASHBOARD_READ,
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_ORDERS_MANAGE,
    PERMISSIONS.GASTRO_MENU_READ,
    PERMISSIONS.GASTRO_TABLES_READ,
    PERMISSIONS.GASTRO_TABLES_MANAGE,
    PERMISSIONS.GASTRO_WAITERS_OPERATE,
    PERMISSIONS.GASTRO_WAITERS_MANAGE,
    PERMISSIONS.GASTRO_INVENTORY_READ,
    PERMISSIONS.GASTRO_REPORTS_READ,
  ],

  ACREDITADOR: [
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.ACCREDITATIONS_READ,
    PERMISSIONS.ACCREDITATIONS_MANAGE,
    PERMISSIONS.ACCREDITATIONS_PRINT,
  ],

  SCANNER: [
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.ACCREDITATIONS_READ,
    PERMISSIONS.ACCREDITATIONS_CHECKIN,
  ],

  REPORTES: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.ACCREDITATIONS_READ,
    PERMISSIONS.ACCREDITATIONS_REPORTS,
    PERMISSIONS.GASTRO_DASHBOARD_READ,
    PERMISSIONS.GASTRO_REPORTS_READ,
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
    PERMISSIONS.GASTRO_ORDERS_READ,
    PERMISSIONS.GASTRO_WAITERS_OPERATE,
  ],

  GUEST: [
    PERMISSIONS.EVENTS_READ,
    PERMISSIONS.CATALOG_READ,
    PERMISSIONS.REQUESTS_SUBMIT,
    PERMISSIONS.REQUESTS_READ,
    PERMISSIONS.GASTRO_MENU_READ,
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
  if (role === "SUPER_ADMIN" || role === "OWNER" || role === "ADMINISTRADOR") {
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
  if (role === "SUPER_ADMIN" || role === "OWNER" || role === "ADMINISTRADOR") return true;
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
