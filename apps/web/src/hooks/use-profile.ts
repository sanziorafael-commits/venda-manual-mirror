"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { fetchMeUser, toAuthUser } from "@/lib/auth-me";
import type { MeUser } from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";

type UseProfileResult = {
  data: MeUser | null;
  isLoading: boolean;
  error: string | null;
  hydrated: boolean;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<MeUser | null>>;
};

export function useProfile(): UseProfileResult {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const clear = useAuthStore((state) => state.clear);

  const [data, setData] = React.useState<MeUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const refetch = React.useCallback(async () => {
    if (!hydrated) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchMeUser();

    if (result.kind === "invalid_session") {
      clear();
      setData(null);
      setError("Sessão expirada");
      setIsLoading(false);
      router.replace("/login");
      return;
    }

    if (result.kind === "temporary_error") {
      setData(null);
      setError("Não foi possível carregar o perfil.");
      setIsLoading(false);
      return;
    }

    setData(result.user);
    setUser(toAuthUser(result.user));
    setIsLoading(false);
  }, [clear, hydrated, router, setUser]);

  React.useEffect(() => {
    if (!hydrated) {
      return;
    }

    void refetch();
  }, [hydrated, refetch]);

  return {
    data,
    isLoading,
    error,
    hydrated,
    refetch,
    setData,
  };
}

