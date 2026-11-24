import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";

export default async function HomePage() {
  const staffSession = await getCurrentSession();

  // Si es personal del establecimiento (Owner, DJ, Manager, Super Admin)
  if (staffSession) {
    if (staffSession.role === "DJ") {
      redirect("/dashboard/dj");
    }
    redirect("/dashboard");
  }

  // Por defecto para clientes, comensales y visitantes de la app -> al Portal de Invitados
  redirect("/guest");
}
