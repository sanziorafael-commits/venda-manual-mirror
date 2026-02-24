import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const PLATFORM_ADMIN_CONTEXT = "__PLATFORM_ADMIN__";
const COMPANY_CONTEXT_STORAGE_KEY = "handsell.company_context.v2";

const memoryStorage: Storage = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
  clear: () => undefined,
  key: () => null,
  length: 0,
};

type CompanyContextStoreState = {
  selectedContext: string | null;
  setSelectedContext: (nextContext: string | null) => void;
  clear: () => void;
};

export const useCompanyContextStore = create<CompanyContextStoreState>()(
  persist(
    (set) => ({
      selectedContext: null,
      setSelectedContext: (nextContext) =>
        set({
          selectedContext: nextContext,
        }),
      clear: () =>
        set({
          selectedContext: null,
        }),
    }),
    {
      name: COMPANY_CONTEXT_STORAGE_KEY,
      storage: createJSONStorage(() =>
        typeof window === "undefined" ? memoryStorage : window.localStorage,
      ),
      partialize: (state) => ({
        selectedContext: state.selectedContext,
      }),
      version: 2,
    },
  ),
);

export function useSelectedCompanyContext() {
  return useCompanyContextStore((state) => state.selectedContext);
}

export function clearCompanyContextStore() {
  useCompanyContextStore.getState().clear();
}

export function isPlatformAdminContext(value: string | null) {
  return value === PLATFORM_ADMIN_CONTEXT;
}

