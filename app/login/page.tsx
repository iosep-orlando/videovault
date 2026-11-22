import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

export default function LoginPage() {
  return (
    <main className="px-4">
      {/* useSearchParams (para ?next=) necesita un Suspense alrededor. */}
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
