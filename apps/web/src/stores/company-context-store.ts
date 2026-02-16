import { create } from "zustand";

export const PLATFORM_ADMIN_CONTEXT = "__PLATFORM_ADMIN__";

type CompanyContextStoreState = {
  selectedContext: string | null;
  setSelectedContext: (nextContext: string | null) => void;
  clear: () => void;
};

export const useCompanyContextStore = create<CompanyContextStoreState>(
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
