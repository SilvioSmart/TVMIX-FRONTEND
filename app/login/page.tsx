import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Accesso amministrazione | TVMIX",
  description: "Accedi al pannello amministrativo TVMIX.",
};

export default async function LoginPage() {
  const user = await getAdminSession();
  if (user) redirect("/admin");

  return <LoginForm />;
}
