import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function RegisterPage() {
  return (
    <main className="px-4">
      <Suspense>
        <AuthForm mode="register" />
      </Suspense>
    </main>
  );
}
