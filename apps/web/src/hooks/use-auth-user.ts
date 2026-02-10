"use client";

import { useAuthStore } from "@/stores/auth-store";

export function useAuthUser() {
  return useAuthStore((state) => state.user);
}

export function useAuthHydrated() {
  return useAuthStore((state) => state.hydrated);
}
