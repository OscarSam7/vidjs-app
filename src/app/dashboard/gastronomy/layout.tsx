"use client";

import React from "react";

/**
 * Layout limpio del módulo Gastronómico:
 * La navegación de todos los submódulos se centraliza exclusivamente en el Menú Lateral colapsable
 * para evitar barras redundantes en escritorio y celular.
 */
export default function GastronomyLayout({ children }: { children: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}
