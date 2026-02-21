import Image from "next/image";
import type { ReactNode } from "react";

type LoginLayoutProps = {
  children: ReactNode;
};

export function LoginLayout({ children }: LoginLayoutProps) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex flex-1 flex-col items-center justify-center">
          <div className="w-full max-w-md">
            <Image
              src="/logo-handsell-orienta.svg"
              alt="Logo HandSell"
              quality={75}
              loading="lazy"
              width={530}
              height={60}
              className=" object-contain"
            />
          </div>
          <h2 className="text-center text-xl text-[#798E99] mb-20 mt-8">
            O portal de inteligência para gestão comercial.
          </h2>
          <div className="w-full max-w-xs">{children}</div>
        </div>
      </div>
      <div className="bg-muted relative hidden lg:block">
        <Image
          src="/login-bg-handsell.jpg"
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

