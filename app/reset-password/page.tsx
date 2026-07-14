import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/admin/PasswordRecoveryForms";

export const metadata: Metadata = {
  title: "Nuova password | TVMIX",
  description: "Imposta una nuova password per il tuo account TVMIX.",
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
