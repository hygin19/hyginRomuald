import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata: Metadata = { title: "Créer un compte" };

export default function InscriptionPage() {
  return (
    <AuthLayout
      title="Créez votre compte démo"
      subtitle="50 000 MGA fictifs vous attendent pour découvrir l'arène, le centre de prédiction et les statistiques."
      footer="Compte de démonstration : aucun document, aucun paiement, aucun pari réel."
    >
      <SignupForm />
    </AuthLayout>
  );
}
