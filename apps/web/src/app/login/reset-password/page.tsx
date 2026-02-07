import { RouteGuard } from "@/components/auth/route-guard";
import { ResetPasswordForm } from "@/components/login/reset-password-form";
import Image from "next/image";

export default function LoginPage() {
  return (
    <RouteGuard mode="guest">
      <div className="grid min-h-svh lg:grid-cols-2">
        <div className="flex flex-col gap-4 p-6 md:p-10">
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs">
              <Image
                src="/logo-handsell.svg"
                alt="Imagem de fundo"
                quality={75}
                loading="lazy"
                width={377}
                height={75}
                className="mb-30 object-contain"
              />
              <ResetPasswordForm />
            </div>
          </div>
        </div>
        <div className="bg-muted relative hidden lg:block">
          <Image
            src="/login-bg.jpg"
            alt="Imagem de fundo"
            quality={75}
            loading="lazy"
            sizes="(max-width: 768px) 100vw, 50vw"
            fill
            className="object-cover h-screen w-full"
          />
        </div>
      </div>
    </RouteGuard>
  );
}
