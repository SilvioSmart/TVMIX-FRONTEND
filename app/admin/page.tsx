import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { getAdminSession } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Configurazione piattaforma | TVMIX",
  description: "Pannello di amministrazione della piattaforma TVMIX.",
};

export default async function AdminPage() {
  const user = await getAdminSession();
  if (!user) redirect("/login");

  return <AdminDashboard user={user} />;
}
