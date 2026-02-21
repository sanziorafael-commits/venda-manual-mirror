import { ActivateAccountForm } from "@/components/login/activate-account-form";
import { LoginLayout } from "@/components/login/login-layout";
import { Suspense } from "react";

export default function ActivateAccountPage() {
  return (
    <LoginLayout>
      <Suspense fallback={<div className="h-10" />}>
        <ActivateAccountForm />
      </Suspense>
    </LoginLayout>
  );
}

