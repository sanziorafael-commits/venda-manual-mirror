import Image from "next/image";
import type { ReactNode } from "react";

type LoginLayoutProps = {
  children: ReactNode;
};

export function LoginLayout({ children }: LoginLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <Image
              src="/logo-handsell.svg"
              alt="Logo HandSell"
              quality={75}
              loading="lazy"
              width={377}
              height={75}
              className="mb-30 object-contain"
            />
            {children}
          </div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/login-bg.jpg"
          alt="Imagem de fundo do login"
          quality={75}
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 50vw"
          fill
          className="h-screen w-full object-cover"
        />
      </div>
    </div>
  );
}
