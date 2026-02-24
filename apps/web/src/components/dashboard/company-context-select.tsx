"use client";

import * as React from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import { dashboardFilterOptionsApiResponseSchema } from "@/schemas/dashboard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PLATFORM_ADMIN_CONTEXT,
  useCompanyContextStore,
  useSelectedCompanyContext,
} from "@/stores/company-context-store";

const PLATFORM_ADMIN_LABEL = "Handsell (admin)";

type ContextOption = {
  value: string;
  label: string;
  logo_signed_url?: string | null;
};

export function CompanyContextSelect() {
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const selectedContext = useSelectedCompanyContext();
  const setSelectedContext = useCompanyContextStore(
    (state) => state.setSelectedContext,
  );

  const [isLoadingOptions, setIsLoadingOptions] = React.useState(false);
  const [options, setOptions] = React.useState<ContextOption[]>([]);
  const optionsRequestRef = React.useRef(0);
  const hasRequestedOptions = optionsRequestRef.current > 0;

  React.useEffect(() => {
    if (!authHydrated || !authUser) {
      return;
    }

    const currentRequestId = ++optionsRequestRef.current;
    setIsLoadingOptions(true);

    const loadOptions = async () => {
      try {
        const response = await apiFetch<unknown>("/dashboard/filter-options");
        if (currentRequestId !== optionsRequestRef.current) {
          return;
        }

        const parsed =
          dashboardFilterOptionsApiResponseSchema.safeParse(response);
        if (!parsed.success) {
          toast.error("Resposta inesperada ao carregar empresas.");
          setOptions(
            authUser.role === "ADMIN"
              ? [
                  {
                    value: PLATFORM_ADMIN_CONTEXT,
                    label: PLATFORM_ADMIN_LABEL,
                  },
                ]
              : [],
          );
          return;
        }

        setOptions(
          authUser.role === "ADMIN"
            ? [
                {
                  value: PLATFORM_ADMIN_CONTEXT,
                  label: PLATFORM_ADMIN_LABEL,
                },
                ...parsed.data.data.company_options,
              ]
            : parsed.data.data.company_options,
        );
      } catch (error) {
        if (currentRequestId !== optionsRequestRef.current) {
          return;
        }

        toast.error(parseApiError(error));
        setOptions(
          authUser.role === "ADMIN"
            ? [
                {
                  value: PLATFORM_ADMIN_CONTEXT,
                  label: PLATFORM_ADMIN_LABEL,
                },
              ]
            : [],
        );
      } finally {
        if (currentRequestId === optionsRequestRef.current) {
          setIsLoadingOptions(false);
        }
      }
    };

    void loadOptions();
  }, [authHydrated, authUser]);

  React.useEffect(() => {
    if (!authHydrated || !authUser || authUser.role === "ADMIN") {
      return;
    }

    if (authUser.company_id !== selectedContext) {
      setSelectedContext(authUser.company_id);
    }
  }, [authHydrated, authUser, selectedContext, setSelectedContext]);

  React.useEffect(() => {
    if (!authHydrated || !authUser || authUser.role !== "ADMIN") {
      return;
    }

    if (options.length === 0) {
      return;
    }

    const optionValues = new Set(options.map((option) => option.value));
    if (selectedContext && optionValues.has(selectedContext)) {
      return;
    }

    const defaultCompanyOption = options.find(
      (option) => option.value !== PLATFORM_ADMIN_CONTEXT,
    );
    setSelectedContext(defaultCompanyOption?.value ?? PLATFORM_ADMIN_CONTEXT);
  }, [authHydrated, authUser, options, selectedContext, setSelectedContext]);

  if (!authHydrated || !authUser) {
    return <CompanyNameSkeleton />;
  }

  if (authUser.role !== "ADMIN") {
    const isCompanyLoading =
      options.length === 0 && (!hasRequestedOptions || isLoadingOptions);
    if (isCompanyLoading) {
      return <CompanyNameSkeleton />;
    }

    const selectedCompanyOption =
      options.find((option) => option.value === authUser.company_id) ??
      options[0] ??
      null;
    const company_name = selectedCompanyOption?.label ?? "Sem empresa";
    const company_logo_url = selectedCompanyOption?.logo_signed_url ?? null;

    return (
      <div className="flex items-center gap-2">
        <Avatar className="size-7">
          {company_logo_url ? (
            <AvatarImage
              src={company_logo_url}
              alt={`Logo da empresa ${company_name}`}
              className="border overline-hidden rounded-full"
            />
          ) : (
            <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-semibold">
              {initialFromName(company_name)}
            </AvatarFallback>
          )}
        </Avatar>
        <span className="text-sm font-medium text-foreground">
          {company_name}
        </span>
      </div>
    );
  }

  const isAdminLoading =
    options.length === 0 && (!hasRequestedOptions || isLoadingOptions);
  if (isAdminLoading) {
    return <CompanySelectSkeleton />;
  }

  return (
    <label className="text-muted-foreground flex gap-2 text-xs font-medium items-center">
      Empresa
      <select
        value={selectedContext ?? ""}
        onChange={(event) => setSelectedContext(event.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-[3px]"
        disabled={isLoadingOptions}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function initialFromName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) {
    return "H";
  }

  return trimmed[0]!.toUpperCase();
}

function CompanyNameSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-7 rounded-full" />
      <Skeleton className="h-4 w-28" />
    </div>
  );
}

function CompanySelectSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-3 w-12" />
      <Skeleton className="h-9 w-40" />
    </div>
  );
}
