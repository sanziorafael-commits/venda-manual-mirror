"use client";

import type { ReactNode } from "react";

type GuardMode = "guest" | "protected";

type RouteGuardProps = {
  mode: GuardMode;
  children: ReactNode;
};

/**
 * Guard legado.
 * A protecao oficial de autenticacao agora acontece em `src/proxy.ts` (server side).
 */
export function RouteGuard({ children }: RouteGuardProps) {
  return <>{children}</>;
}
