import { ResetPasswordForm } from "@/components/login/reset-password-form";
import { LoginLayout } from "@/components/login/login-layout";
import { Suspense } from "react";

export default function ResetPasswordPage() {
  return (
    <LoginLayout>
      <Suspense fallback={<div className="h-10" />}>
        <ResetPasswordForm />
      </Suspense>
    </LoginLayout>
  );
}
