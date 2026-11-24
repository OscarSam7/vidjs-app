import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/session";

export default async function DjShortcutPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/dj-personal");
  }

  redirect("/dashboard/dj/pro");
}
