import { redirect } from "next/navigation";

export default function LegacyTablesRedirectPage() {
  redirect("/dashboard/gastronomy/tables");
}
