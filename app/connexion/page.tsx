import type { Metadata } from "next";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Connexion" };

export default function ConnexionPage() {
  return (
    <AuthLayout
      title="Bon retour dans l'arène"
      subtitle="Connectez-vous pour retrouver votre solde démo, vos prédictions et l'historique de vos manches."
      footer="Vos identifiants sont gérés par Supabase Auth (email + mot de passe)."
    >
      <LoginForm />
    </AuthLayout>
  );
}
