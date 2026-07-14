import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/admin/PasswordRecoveryForms";

export const metadata: Metadata = {
  title: "Recupera password | TVMIX",
  description: "Richiedi un link di recupero password TVMIX.",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
