"use client";

import * as React from "react";
import { ArrowRightLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import { formatPhoneDisplay } from "@/lib/phone";
import {
  canReassignManagers,
  canReassignSupervisors,
} from "@/lib/role-capabilities";
import { dashboardFilterOptionsApiResponseSchema } from "@/schemas/dashboard";
import {
  reassignManagerTeamApiResponseSchema,
  reassignSupervisorApiResponseSchema,
  usersApiResponseSchema,
  type UserListItem,
} from "@/schemas/user";
import {
  isPlatformAdminContext,
  useSelectedCompanyContext,
} from "@/stores/company-context-store";

type CompanyOption = {
  value: string;
  label: string;
};

type UserOption = {
  id: string;
  label: string;
};

const USER_LIST_PAGE_SIZE = 100;
const USER_LIST_MAX_PAGES = 20;

export function UsersMassReassignmentWrapper() {
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const selectedCompanyContext = useSelectedCompanyContext();

  const isAdmin = authUser?.role === "ADMIN";
  const canReassignManagersForRole = authUser
    ? canReassignManagers(authUser.role)
    : false;
  const canReassignSupervisorsForRole = authUser
    ? canReassignSupervisors(authUser.role)
    : false;

  const selectedCompanyFromHeader = React.useMemo(() => {
    if (!isAdmin) {
      return "";
    }

    if (
      !selectedCompanyContext ||
      isPlatformAdminContext(selectedCompanyContext)
    ) {
      return "";
    }

    return selectedCompanyContext;
  }, [isAdmin, selectedCompanyContext]);

  const [companyOptions, setCompanyOptions] = React.useState<CompanyOption[]>(
    [],
  );
  const [selectedCompanyId, setSelectedCompanyId] = React.useState("");
  const [managerOptions, setManagerOptions] = React.useState<UserOption[]>([]);
  const [supervisorOptions, setSupervisorOptions] = React.useState<
    UserOption[]
  >([]);

  const [fromManagerId, setFromManagerId] = React.useState("");
  const [toManagerId, setToManagerId] = React.useState("");
  const [fromSupervisorId, setFromSupervisorId] = React.useState("");
  const [toSupervisorId, setToSupervisorId] = React.useState("");

  const [isLoadingCompanies, setIsLoadingCompanies] = React.useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = React.useState(false);
  const [isSubmittingManager, setIsSubmittingManager] = React.useState(false);
  const [isSubmittingSupervisor, setIsSubmittingSupervisor] =
    React.useState(false);

  const hasInitializedCompanyRef = React.useRef(false);
  const companiesRequestIdRef = React.useRef(0);
  const usersRequestIdRef = React.useRef(0);

  React.useEffect(() => {
    if (!authHydrated || !authUser || hasInitializedCompanyRef.current) {
      return;
    }

    hasInitializedCompanyRef.current = true;

    if (authUser.role === "ADMIN") {
      setSelectedCompanyId(selectedCompanyFromHeader);
      return;
    }

    setSelectedCompanyId(authUser.company_id ?? "");
  }, [authHydrated, authUser, selectedCompanyFromHeader]);

  React.useEffect(() => {
    if (!authHydrated || !authUser) {
      return;
    }

    const currentRequestId = ++companiesRequestIdRef.current;
    setIsLoadingCompanies(true);

    const loadCompanies = async () => {
      try {
        const response = await apiFetch<unknown>("/dashboard/filter-options");
        if (currentRequestId !== companiesRequestIdRef.current) {
          return;
        }

        const parsed =
          dashboardFilterOptionsApiResponseSchema.safeParse(response);
        if (!parsed.success) {
          toast.error("Resposta inesperada ao carregar empresas.");
          setCompanyOptions([]);
          return;
        }

        const nextOptions = parsed.data.data.company_options.map((option) => ({
          value: option.value,
          label: option.label,
        }));

        setCompanyOptions(nextOptions);

        if (authUser.role === "ADMIN") {
          setSelectedCompanyId((currentValue) => {
            if (
              currentValue.length > 0 &&
              nextOptions.some((option) => option.value === currentValue)
            ) {
              return currentValue;
            }

            if (
              selectedCompanyFromHeader.length > 0 &&
              nextOptions.some(
                (option) => option.value === selectedCompanyFromHeader,
              )
            ) {
              return selectedCompanyFromHeader;
            }

            return "";
          });
        }
      } catch (error) {
        if (currentRequestId !== companiesRequestIdRef.current) {
          return;
        }

        toast.error(parseApiError(error));
        setCompanyOptions([]);
      } finally {
        if (currentRequestId === companiesRequestIdRef.current) {
          setIsLoadingCompanies(false);
        }
      }
    };

    void loadCompanies();
  }, [authHydrated, authUser, selectedCompanyFromHeader]);

  React.useEffect(() => {
    if (!authHydrated || !authUser || !canReassignSupervisorsForRole) {
      return;
    }

    if (!selectedCompanyId) {
      setManagerOptions([]);
      setSupervisorOptions([]);
      setFromManagerId("");
      setToManagerId("");
      setFromSupervisorId("");
      setToSupervisorId("");
      return;
    }

    const currentRequestId = ++usersRequestIdRef.current;
    setIsLoadingUsers(true);

    const loadUsersByScope = async () => {
      try {
        const [managers, supervisors] = await Promise.all([
          canReassignManagersForRole
            ? fetchAllUsersByRole({
                role: "GERENTE_COMERCIAL",
                companyId: selectedCompanyId,
                isAdmin,
              })
            : Promise.resolve([]),
          fetchAllUsersByRole({
            role: "SUPERVISOR",
            companyId: selectedCompanyId,
            isAdmin,
          }),
        ]);

        if (currentRequestId !== usersRequestIdRef.current) {
          return;
        }

        const nextManagerOptions = managers.map(buildUserOption);
        const nextSupervisorOptions = supervisors.map(buildUserOption);

        setManagerOptions(nextManagerOptions);
        setSupervisorOptions(nextSupervisorOptions);

        const managerOptionIds = new Set(
          nextManagerOptions.map((option) => option.id),
        );
        const supervisorOptionIds = new Set(
          nextSupervisorOptions.map((option) => option.id),
        );

        setFromManagerId((currentValue) =>
          managerOptionIds.has(currentValue) ? currentValue : "",
        );
        setToManagerId((currentValue) =>
          managerOptionIds.has(currentValue) ? currentValue : "",
        );
        setFromSupervisorId((currentValue) =>
          supervisorOptionIds.has(currentValue) ? currentValue : "",
        );
        setToSupervisorId((currentValue) =>
          supervisorOptionIds.has(currentValue) ? currentValue : "",
        );
      } catch (error) {
        if (currentRequestId !== usersRequestIdRef.current) {
          return;
        }

        toast.error(parseApiError(error));
        setManagerOptions([]);
        setSupervisorOptions([]);
      } finally {
        if (currentRequestId === usersRequestIdRef.current) {
          setIsLoadingUsers(false);
        }
      }
    };

    void loadUsersByScope();
  }, [
    authHydrated,
    authUser,
    canReassignManagersForRole,
    canReassignSupervisorsForRole,
    isAdmin,
    selectedCompanyId,
  ]);

  const companySelectOptions = React.useMemo(() => {
    if (companyOptions.length > 0) {
      return companyOptions;
    }

    if (authUser?.company_id) {
      return [{ value: authUser.company_id, label: "Empresa do usuario" }];
    }

    return [];
  }, [authUser?.company_id, companyOptions]);

  const selectedCompanyLabel = React.useMemo(
    () =>
      companySelectOptions.find((option) => option.value === selectedCompanyId)
        ?.label ?? "",
    [companySelectOptions, selectedCompanyId],
  );

  const handleSubmitManagerTeam = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!canReassignManagersForRole) {
        toast.error("Perfil sem permissao para troca de gerentes.");
        return;
      }

      if (!selectedCompanyId) {
        toast.error("Selecione uma empresa para continuar.");
        return;
      }

      if (!fromManagerId || !toManagerId) {
        toast.error("Selecione gerente de origem e destino.");
        return;
      }

      if (fromManagerId === toManagerId) {
        toast.error("Gerente de origem e destino nao podem ser iguais.");
        return;
      }

      const fromLabel =
        managerOptions.find((option) => option.id === fromManagerId)?.label ??
        "gerente selecionado";
      const toLabel =
        managerOptions.find((option) => option.id === toManagerId)?.label ??
        "gerente selecionado";

      const confirmed = window.confirm(
        `Confirma a troca em massa de gerentes?\n\nEmpresa: ${selectedCompanyLabel || selectedCompanyId}\nOrigem: ${fromLabel}\nDestino: ${toLabel}`,
      );
      if (!confirmed) {
        return;
      }

      setIsSubmittingManager(true);

      try {
        const response = await apiFetch<unknown>(
          "/users/actions/reassign-manager-team",
          {
            method: "POST",
            body: {
              from_manager_id: fromManagerId,
              to_manager_id: toManagerId,
            },
          },
        );

        const parsed = reassignManagerTeamApiResponseSchema.safeParse(response);
        if (!parsed.success) {
          toast.error("Resposta inesperada ao reatribuir equipe de gerente.");
          return;
        }

        toast.success(
          `Troca concluida: ${parsed.data.data.supervisors_moved} supervisores movidos e ${parsed.data.data.vendors_impacted} vendedores impactados.`,
        );
      } catch (error) {
        toast.error(parseApiError(error));
      } finally {
        setIsSubmittingManager(false);
      }
    },
    [
      canReassignManagersForRole,
      fromManagerId,
      managerOptions,
      selectedCompanyId,
      selectedCompanyLabel,
      toManagerId,
    ],
  );

  const handleSubmitSupervisor = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!canReassignSupervisorsForRole) {
        toast.error("Perfil sem permissao para troca de supervisores.");
        return;
      }

      if (!selectedCompanyId) {
        toast.error("Selecione uma empresa para continuar.");
        return;
      }

      if (!fromSupervisorId || !toSupervisorId) {
        toast.error("Selecione supervisor de origem e destino.");
        return;
      }

      if (fromSupervisorId === toSupervisorId) {
        toast.error("Supervisor de origem e destino nao podem ser iguais.");
        return;
      }

      const fromLabel =
        supervisorOptions.find((option) => option.id === fromSupervisorId)
          ?.label ?? "supervisor selecionado";
      const toLabel =
        supervisorOptions.find((option) => option.id === toSupervisorId)
          ?.label ?? "supervisor selecionado";

      const confirmed = window.confirm(
        `Confirma a troca em massa de supervisores?\n\nEmpresa: ${selectedCompanyLabel || selectedCompanyId}\nOrigem: ${fromLabel}\nDestino: ${toLabel}`,
      );
      if (!confirmed) {
        return;
      }

      setIsSubmittingSupervisor(true);

      try {
        const response = await apiFetch<unknown>(
          "/users/actions/reassign-supervisor",
          {
            method: "POST",
            body: {
              from_supervisor_id: fromSupervisorId,
              to_supervisor_id: toSupervisorId,
            },
          },
        );

        const parsed = reassignSupervisorApiResponseSchema.safeParse(response);
        if (!parsed.success) {
          toast.error("Resposta inesperada ao reatribuir supervisores.");
          return;
        }

        toast.success(
          `Troca concluida: ${parsed.data.data.moved_vendors} vendedores reatribuidos.`,
        );
      } catch (error) {
        toast.error(parseApiError(error));
      } finally {
        setIsSubmittingSupervisor(false);
      }
    },
    [
      canReassignSupervisorsForRole,
      fromSupervisorId,
      selectedCompanyId,
      selectedCompanyLabel,
      supervisorOptions,
      toSupervisorId,
    ],
  );

  if (!authHydrated || !authUser) {
    return null;
  }

  if (!canReassignSupervisorsForRole) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
        Seu perfil nao possui permissao para alteracoes em massa.
      </div>
    );
  }

  const isBusy =
    isLoadingCompanies ||
    isLoadingUsers ||
    isSubmittingManager ||
    isSubmittingSupervisor;

  return (
    <section className="flex w-full max-w-5xl flex-col gap-5">
      {isAdmin ? (
        <div className="rounded-xl border bg-card p-5">
          <h3 className="text-lg font-semibold">Contexto da operação</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Selecione a empresa e depois escolha origem e destino para a troca
            em massa.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label
                htmlFor="mass-reassignment-company"
                className="text-sm font-medium"
              >
                Empresa
              </label>
              <select
                id="mass-reassignment-company"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                disabled={
                  isLoadingCompanies ||
                  isSubmittingManager ||
                  isSubmittingSupervisor
                }
              >
                <option value="">Selecione uma empresa</option>
                {companySelectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      {isAdmin && !selectedCompanyId ? (
        <div className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          Selecione uma empresa para habilitar as operacoes.
        </div>
      ) : null}

      {canReassignManagersForRole ? (
        <form
          onSubmit={handleSubmitManagerTeam}
          className="rounded-xl border bg-card p-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <ArrowRightLeft className="size-4" />
            <h3 className="text-lg font-semibold">
              Troca em massa de gerentes
            </h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Move todos os supervisores do gerente de origem para o gerente de
            destino.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="from-manager" className="text-sm font-medium">
                Gerente antigo
              </label>
              <select
                id="from-manager"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={fromManagerId}
                onChange={(event) => setFromManagerId(event.target.value)}
                disabled={
                  isBusy || !selectedCompanyId || managerOptions.length === 0
                }
              >
                <option value="">Selecione o gerente antigo</option>
                {managerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="to-manager" className="text-sm font-medium">
                Novo gerente
              </label>
              <select
                id="to-manager"
                className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                value={toManagerId}
                onChange={(event) => setToManagerId(event.target.value)}
                disabled={
                  isBusy || !selectedCompanyId || managerOptions.length === 0
                }
              >
                <option value="">Selecione o novo gerente</option>
                {managerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {managerOptions.length === 0
                ? "Nenhum gerente disponivel no escopo atual."
                : `${managerOptions.length} gerente(s) disponiveis no escopo.`}
            </p>
            <Button
              type="submit"
              disabled={
                !selectedCompanyId ||
                isBusy ||
                managerOptions.length === 0 ||
                !fromManagerId ||
                !toManagerId
              }
            >
              {isSubmittingManager ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Aplicando...
                </>
              ) : (
                "Aplicar troca de gerentes"
              )}
            </Button>
          </div>
        </form>
      ) : null}

      <form
        onSubmit={handleSubmitSupervisor}
        className="rounded-xl border bg-card p-5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <ArrowRightLeft className="size-4" />
          <h3 className="text-lg font-semibold">
            Troca em massa de supervisores
          </h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Move todos os vendedores do supervisor de origem para o supervisor de
          destino.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="from-supervisor" className="text-sm font-medium">
              Supervisor antigo
            </label>
            <select
              id="from-supervisor"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={fromSupervisorId}
              onChange={(event) => setFromSupervisorId(event.target.value)}
              disabled={
                isBusy || !selectedCompanyId || supervisorOptions.length === 0
              }
            >
              <option value="">Selecione o supervisor antigo</option>
              {supervisorOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="to-supervisor" className="text-sm font-medium">
              Novo supervisor
            </label>
            <select
              id="to-supervisor"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={toSupervisorId}
              onChange={(event) => setToSupervisorId(event.target.value)}
              disabled={
                isBusy || !selectedCompanyId || supervisorOptions.length === 0
              }
            >
              <option value="">Selecione o novo supervisor</option>
              {supervisorOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            {supervisorOptions.length === 0
              ? "Nenhum supervisor disponivel no escopo atual."
              : `${supervisorOptions.length} supervisor(es) disponiveis no escopo.`}
          </p>
          <Button
            type="submit"
            disabled={
              !selectedCompanyId ||
              isBusy ||
              supervisorOptions.length === 0 ||
              !fromSupervisorId ||
              !toSupervisorId
            }
          >
            {isSubmittingSupervisor ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Aplicando...
              </>
            ) : (
              "Aplicar troca de supervisores"
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

async function fetchAllUsersByRole(input: {
  role: "GERENTE_COMERCIAL" | "SUPERVISOR";
  companyId: string;
  isAdmin: boolean;
}) {
  const users: UserListItem[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= USER_LIST_MAX_PAGES) {
    const params = new URLSearchParams();
    params.set("role", input.role);
    params.set("page", String(page));
    params.set("page_size", String(USER_LIST_PAGE_SIZE));

    if (input.isAdmin) {
      params.set("company_id", input.companyId);
    }

    const response = await apiFetch<unknown>(`/users?${params.toString()}`);
    const parsed = usersApiResponseSchema.safeParse(response);

    if (!parsed.success) {
      throw new Error("Resposta inesperada ao carregar usuarios do escopo.");
    }

    users.push(...parsed.data.data);
    totalPages = parsed.data.meta.total_pages;
    page += 1;
  }

  return users
    .filter((user) => user.role === input.role)
    .filter((user) => user.is_active)
    .filter((user) => !user.deleted_at)
    .sort((left, right) => left.full_name.localeCompare(right.full_name));
}

function buildUserOption(user: UserListItem): UserOption {
  return {
    id: user.id,
    label: formatUserOptionLabel(user),
  };
}

function formatUserOptionLabel(user: UserListItem) {
  const phoneLabel = formatPhoneDisplay(user.phone);
  if (!phoneLabel || phoneLabel === user.phone) {
    return user.full_name;
  }

  return `${user.full_name} - ${phoneLabel}`;
}
