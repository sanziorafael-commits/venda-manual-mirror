"use client";

import React from "react";

import { fetchAuthenticatedUser } from "@/lib/auth-me";
import type { AuthUser } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";

type AuthStoreHydratorProps = {
  initialUser: AuthUser | null;
};

export function AuthStoreHydrator({ initialUser }: AuthStoreHydratorProps) {
  const hydrate = useAuthStore((state) => state.hydrate);
  const setUser = useAuthStore((state) => state.setUser);
  const clear = useAuthStore((state) => state.clear);

  React.useEffect(() => {
    hydrate(initialUser);
  }, [hydrate, initialUser]);

  React.useEffect(() => {
    let mounted = true;

    const syncUser = async () => {
      const result = await fetchAuthenticatedUser();
      if (!mounted) return;

      if (result.kind === "success") {
        setUser(result.user);
        return;
      }

      if (result.kind === "invalid_session") {
        clear();
      }
    };

    void syncUser();

    return () => {
      mounted = false;
    };
  }, [setUser, clear]);

  return null;
}
