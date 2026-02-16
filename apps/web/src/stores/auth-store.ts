import { create } from "zustand";

import type { AuthUser } from "@/schemas/auth";
import { clearCompanyContextStore } from "@/stores/company-context-store";

type AuthStoreState = {
  user: AuthUser | null;
  hydrated: boolean;
  hydrate: (user: AuthUser | null) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
};

const LEGACY_KEYS = [
  "handsell.access_token",
  "handsell.refresh_token",
  "handsell.token_expires_in",
  "handsell.user",
] as const;

function clearLegacyAuthStorage() {
  if (typeof window === "undefined") return;

  for (const key of LEGACY_KEYS) {
    window.localStorage.removeItem(key);
  }
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  hydrated: false,

  hydrate: (user) =>
    set({
      user,
      hydrated: true,
    }),

  setUser: (user) =>
    set({
      user,
      hydrated: true,
    }),

  clear: () => {
    clearLegacyAuthStorage();
    clearCompanyContextStore();
    set({
      user: null,
      hydrated: true,
    });
  },
}));

export function clearAuthStore() {
  useAuthStore.getState().clear();
}
