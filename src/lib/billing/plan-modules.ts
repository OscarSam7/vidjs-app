export type PlanCode = "PERSONAL" | "STARTER" | "PRO" | "ENTERPRISE";

export const PLAN_RANK: Record<PlanCode, number> = {
  PERSONAL: 1,
  STARTER: 2,
  PRO: 3,
  ENTERPRISE: 4,
};

export const PLAN_LABELS: Record<PlanCode, string> = {
  PERSONAL: "Personal",
  STARTER: "Starter",
  PRO: "Pro",
  ENTERPRISE: "Enterprise",
};

export function normalizePlanCode(code?: string | null): PlanCode {
  const upper = (code || "PRO").toUpperCase();
  if (upper === "PERSONAL" || upper === "STARTER" || upper === "PRO" || upper === "ENTERPRISE") {
    return upper;
  }
  return "PRO";
}

export function isPlanAtLeast(currentPlan: string | null | undefined, requiredPlan: PlanCode): boolean {
  const current = normalizePlanCode(currentPlan);
  return PLAN_RANK[current] >= PLAN_RANK[requiredPlan];
}

export interface PlanModuleRule {
  prefix: string;
  requiredPlan: PlanCode;
  title: string;
}

/**
 * Reglas de acceso por ruta según el plan contratado.
 * Se ordenan de más específico a más general para evaluación determinista.
 */
export const PLAN_ROUTE_RULES: PlanModuleRule[] = [
  // Acreditación & Eventos masivos -> Enterprise
  { prefix: "/dashboard/accreditation", requiredPlan: "ENTERPRISE", title: "Acreditación & Eventos" },
  { prefix: "/dashboard/audit", requiredPlan: "ENTERPRISE", title: "Auditoría & Registros" },

  // Gastronomía Avanzada (KDS, Mozos, Inventario, Facturación ERP, Pagos QR) -> Pro
  { prefix: "/dashboard/gastronomy/bar", requiredPlan: "PRO", title: "Barra (KDS)" },
  { prefix: "/dashboard/gastronomy/kitchen", requiredPlan: "PRO", title: "Cocina (KDS)" },
  { prefix: "/dashboard/gastronomy/waiters", requiredPlan: "PRO", title: "App de Mozos" },
  { prefix: "/dashboard/gastronomy/payments", requiredPlan: "PRO", title: "Pagos Digitales QR/PIX" },
  { prefix: "/dashboard/gastronomy/inventory", requiredPlan: "PRO", title: "Control de Inventario" },
  { prefix: "/dashboard/gastronomy/invoicing", requiredPlan: "PRO", title: "Ventas Pendientes de Facturación" },
  { prefix: "/dashboard/gastronomy/reports", requiredPlan: "PRO", title: "Reportes Gastronómicos" },

  // Gastronomía Base -> Starter
  { prefix: "/dashboard/gastronomy", requiredPlan: "STARTER", title: "Gestión Gastronómica" },

  // Gestión del Local / Análisis / Personalización avanzados
  { prefix: "/dashboard/reservations", requiredPlan: "PRO", title: "Reservas & Camarotes VIP" },
  { prefix: "/dashboard/contest", requiredPlan: "PRO", title: "Concursos & Votaciones" },
  { prefix: "/dashboard/branding", requiredPlan: "PRO", title: "Marca & White-Label" },
  { prefix: "/dashboard/team", requiredPlan: "STARTER", title: "Equipo & Roles" },
  { prefix: "/dashboard/tables", requiredPlan: "STARTER", title: "Mesas & QR" },

  // Disponibles desde Personal
  { prefix: "/dashboard/dj", requiredPlan: "PERSONAL", title: "Cabina DJ" },
  { prefix: "/dashboard/karaoke", requiredPlan: "PERSONAL", title: "Cabina Karaoke" },
  { prefix: "/dashboard/library", requiredPlan: "PERSONAL", title: "Biblioteca Musical" },
  { prefix: "/dashboard/events", requiredPlan: "PERSONAL", title: "Eventos & Noches" },
  { prefix: "/dashboard/settings", requiredPlan: "PERSONAL", title: "Configuración" },
  { prefix: "/dashboard/subscription", requiredPlan: "PERSONAL", title: "Suscripción & Plan" },
  { prefix: "/dashboard", requiredPlan: "PERSONAL", title: "Dashboard" },
];

export function getRequiredPlanForPath(pathname: string): PlanModuleRule | null {
  for (const rule of PLAN_ROUTE_RULES) {
    if (pathname === rule.prefix || pathname.startsWith(`${rule.prefix}/`)) {
      return rule;
    }
  }
  return null;
}

export const PLAN_GROUP_MATRIX: Array<{
  group: string;
  plans: Record<PlanCode, string>;
}> = [
  {
    group: "Dashboard",
    plans: { PERSONAL: "Incluido", STARTER: "Incluido", PRO: "Incluido", ENTERPRISE: "Incluido" },
  },
  {
    group: "Entretenimiento (DJ / KJ / Biblioteca / TV)",
    plans: { PERSONAL: "Incluido", STARTER: "Incluido", PRO: "Incluido", ENTERPRISE: "Incluido" },
  },
  {
    group: "Gestión Gastronómica",
    plans: { PERSONAL: "No incluido", STARTER: "Menú + Caja + Mesas", PRO: "Completa (+KDS, Mozos, Stock, ERP)", ENTERPRISE: "Completa Multi-Sede" },
  },
  {
    group: "Gestión del Local (Sedes, Equipo, Reservas VIP)",
    plans: { PERSONAL: "Solo Eventos", STARTER: "Sedes + Equipo", PRO: "Completa (+Reservas VIP)", ENTERPRISE: "Completa Multi-Sede" },
  },
  {
    group: "Análisis & Concursos",
    plans: { PERSONAL: "No incluido", STARTER: "Básico", PRO: "Analítica + Concursos", ENTERPRISE: "Completa (+Auditoría)" },
  },
  {
    group: "Personalización (Branding White-Label)",
    plans: { PERSONAL: "Ajustes básicos", STARTER: "Ajustes básicos", PRO: "White-Label Pro", ENTERPRISE: "White-Label Elite" },
  },
  {
    group: "Acreditación & Eventos Masivos",
    plans: { PERSONAL: "No incluido", STARTER: "No incluido", PRO: "No incluido", ENTERPRISE: "Incluido Completo" },
  },
];
