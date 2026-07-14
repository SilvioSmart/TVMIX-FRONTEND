import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailView } from "@/components/admin/PasswordRecoveryForms";

export const metadata: Metadata = {
  title: "Verifica email | TVMIX",
  description: "Certifica la casella email del tuo account TVMIX.",
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailView />
    </Suspense>
  );
}
