"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { getAccessTokenFromStorage } from "@/lib/auth-session";

type GuardMode = "guest" | "protected";

type RouteGuardProps = {
  mode: GuardMode;
  children: React.ReactNode;
};

export function RouteGuard({ mode, children }: RouteGuardProps) {
  const router = useRouter();
  const [canRender, setCanRender] = React.useState(false);

  React.useEffect(() => {
    const hasToken = Boolean(getAccessTokenFromStorage());

    if (mode === "guest" && hasToken) {
      router.replace("/dashboard");
      return;
    }

    if (mode === "protected" && !hasToken) {
      router.replace("/login");
      return;
    }

    setCanRender(true);
  }, [mode, router]);

  if (!canRender) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

