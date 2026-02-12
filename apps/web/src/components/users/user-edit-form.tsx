"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import { tryApiDelete } from "@/lib/try-api";
import {
  companiesApiResponseSchema,
  type CompanyListItem,
} from "@/schemas/company";
import {
  updateUserFormSchema,
  userDetailsApiResponseSchema,
  usersApiResponseSchema,
  type UpdateUserFormInput,
  type UserListItem,
  type UserRole,
} from "@/schemas/user";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

const COMPANIES_PAGE_SIZE = 100;
const USERS_OPTIONS_PAGE_SIZE = 100;

type SelectOption = {
  id: string;
  label: string;
};

type UserEditFormProps = {
  userId: string;
  backHref: string;
};

const ROLE_LABEL_BY_VALUE: Record<UserRole, string> = {
  ADMIN: "Admin",
  GERENTE_COMERCIAL: "Gerente Comercial",
  SUPERVISOR: "Supervisor",
  VENDEDOR: "Vendedor",
};

function getAllowedRoleOptions(actorRole: UserRole): UserRole[] {
  if (actorRole === "ADMIN") {
    return ["ADMIN", "GERENTE_COMERCIAL", "SUPERVISOR", "VENDEDOR"];
  }

  if (actorRole === "GERENTE_COMERCIAL") {
    return ["SUPERVISOR", "VENDEDOR"];
  }

  return ["VENDEDOR"];
}

function formatCpfInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function getUserInitials(fullName: string) {
  const tokens = fullName.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return "?";
  }

  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase();
  }

  return `${tokens[0].charAt(0)}${tokens[1].charAt(0)}`.toUpperCase();
}

async function fetchUserById(userId: string): Promise<UserListItem | null> {
  const response = await apiFetch<unknown>(`/users/${userId}`);
  const parsed = userDetailsApiResponseSchema.safeParse(response);
  if (!parsed.success) {
    return null;
  }

  return parsed.data.data;
}

async function fetchAllCompaniesForSelect(): Promise<SelectOption[] | null> {
  let page = 1;
  let totalPages = 1;
  const options: SelectOption[] = [];

  while (page <= totalPages) {
    const response = await apiFetch<unknown>(
      `/companies?page=${page}&pageSize=${COMPANIES_PAGE_SIZE}`,
    );
    const parsed = companiesApiResponseSchema.safeParse(response);
    if (!parsed.success) {
      return null;
    }

    options.push(
      ...parsed.data.data.map((company: CompanyListItem) => ({
        id: company.id,
        label: company.name,
      })),
    );

    totalPages = parsed.data.meta.totalPages;
    page += 1;
  }

  return options;
}

async function fetchUserOptionsByRole(input: {
  role: UserRole;
  companyId?: string;
}): Promise<SelectOption[] | null> {
  let page = 1;
  let totalPages = 1;
  const options: SelectOption[] = [];

  while (page <= totalPages) {
    const params = new URLSearchParams();
    params.set("role", input.role);
    params.set("isActive", "true");
    params.set("page", String(page));
    params.set("pageSize", String(USERS_OPTIONS_PAGE_SIZE));

    if (input.companyId) {
      params.set("companyId", input.companyId);
    }

    const response = await apiFetch<unknown>(`/users?${params.toString()}`);
    const parsed = usersApiResponseSchema.safeParse(response);
    if (!parsed.success) {
      return null;
    }

    options.push(
      ...parsed.data.data.map((user: UserListItem) => ({
        id: user.id,
        label: user.fullName,
      })),
    );

    totalPages = parsed.data.meta.totalPages;
    page += 1;
  }

  return options;
}

export function UserEditForm({ userId, backHref }: UserEditFormProps) {
  const router = useRouter();
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const formInitializedRef = React.useRef(false);
  const previousCompanyIdRef = React.useRef<string | null>(null);
  const userRequestIdRef = React.useRef(0);
  const companiesRequestIdRef = React.useRef(0);
  const managersRequestIdRef = React.useRef(0);
  const supervisorsRequestIdRef = React.useRef(0);

  const [userData, setUserData] = React.useState<UserListItem | null>(null);
  const [isLoadingUser, setIsLoadingUser] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [companyOptions, setCompanyOptions] = React.useState<SelectOption[]>(
    [],
  );
  const [managerOptions, setManagerOptions] = React.useState<SelectOption[]>(
    [],
  );
  const [supervisorOptions, setSupervisorOptions] = React.useState<
    SelectOption[]
  >([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = React.useState(false);
  const [isLoadingManagers, setIsLoadingManagers] = React.useState(false);
  const [isLoadingSupervisors, setIsLoadingSupervisors] = React.useState(false);
  const [isReactivating, setIsReactivating] = React.useState(false);

  const {
    register,
    watch,
    reset,
    setValue,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserFormInput>({
    resolver: zodResolver(updateUserFormSchema),
    defaultValues: {
      fullName: "",
      cpf: "",
      email: "",
      phone: "",
      role: "VENDEDOR",
      companyId: "",
      password: "",
      managerId: "",
      supervisorId: "",
    },
  });

  const selectedRole = watch("role");
  const selectedCompanyId = watch("companyId");
  const actorRole = authUser?.role ?? null;
  const isAdminActor = actorRole === "ADMIN";
  const isManagerActor = actorRole === "GERENTE_COMERCIAL";
  const shouldShowCompanyField = isAdminActor && selectedRole !== "ADMIN";
  const shouldShowManagerField =
    isAdminActor && selectedRole === "SUPERVISOR" && Boolean(selectedCompanyId);
  const shouldShowSupervisorField =
    selectedRole === "VENDEDOR" &&
    ((isAdminActor && Boolean(selectedCompanyId)) || isManagerActor);
  const shouldShowPasswordField = selectedRole === "ADMIN";

  const roleOptions = React.useMemo<UserRole[]>(() => {
    if (!actorRole) {
      return ["VENDEDOR"];
    }

    return getAllowedRoleOptions(actorRole);
  }, [actorRole]);

  React.useEffect(() => {
    if (!authHydrated) {
      return;
    }

    const currentRequestId = ++userRequestIdRef.current;
    setIsLoadingUser(true);
    setLoadError(null);

    const load = async () => {
      try {
        const loadedUser = await fetchUserById(userId);
        if (currentRequestId !== userRequestIdRef.current) {
          return;
        }

        if (!loadedUser) {
          setUserData(null);
          setLoadError("Não foi possível carregar os dados do usuário.");
          return;
        }

        setUserData(loadedUser);
      } catch (error) {
        if (currentRequestId !== userRequestIdRef.current) {
          return;
        }

        setUserData(null);
        setLoadError(parseApiError(error));
      } finally {
        if (currentRequestId === userRequestIdRef.current) {
          setIsLoadingUser(false);
        }
      }
    };

    void load();
  }, [authHydrated, userId]);

  React.useEffect(() => {
    if (!authHydrated || !authUser || !userData || formInitializedRef.current) {
      return;
    }

    reset({
      fullName: userData.fullName,
      cpf: formatCpfInput(userData.cpf),
      email: userData.email ?? "",
      phone: formatPhoneInput(userData.phone),
      role: userData.role,
      companyId: userData.companyId ?? "",
      password: "",
      managerId: userData.managerId ?? "",
      supervisorId: userData.supervisorId ?? "",
    });

    previousCompanyIdRef.current = userData.companyId ?? "";
    formInitializedRef.current = true;
  }, [authHydrated, authUser, reset, userData]);

  React.useEffect(() => {
    if (selectedRole !== "SUPERVISOR") {
      setValue("managerId", "");
    }

    if (selectedRole !== "VENDEDOR") {
      setValue("supervisorId", "");
    }

    if (selectedRole !== "ADMIN") {
      setValue("password", "");
    }

    if (!shouldShowCompanyField) {
      setValue("companyId", "");
    }
  }, [selectedRole, setValue, shouldShowCompanyField]);

  React.useEffect(() => {
    if (!isAdminActor || !formInitializedRef.current) {
      return;
    }

    const nextCompanyId = selectedCompanyId ?? "";
    const previousCompanyId = previousCompanyIdRef.current;

    if (previousCompanyId !== null && previousCompanyId !== nextCompanyId) {
      setValue("managerId", "");
      setValue("supervisorId", "");
    }

    previousCompanyIdRef.current = nextCompanyId;
  }, [isAdminActor, selectedCompanyId, setValue]);

  React.useEffect(() => {
    if (!authHydrated || !isAdminActor) {
      return;
    }

    const currentRequestId = ++companiesRequestIdRef.current;
    setIsLoadingCompanies(true);

    const load = async () => {
      try {
        const options = await fetchAllCompaniesForSelect();
        if (currentRequestId !== companiesRequestIdRef.current) {
          return;
        }

        if (!options) {
          toast.error("Não foi possível carregar empresas.");
          setCompanyOptions([]);
          return;
        }

        setCompanyOptions(options);
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

    void load();
  }, [authHydrated, isAdminActor]);

  React.useEffect(() => {
    if (!authHydrated || !shouldShowManagerField || !selectedCompanyId) {
      setManagerOptions([]);
      return;
    }

    const currentRequestId = ++managersRequestIdRef.current;
    setIsLoadingManagers(true);

    const load = async () => {
      try {
        const options = await fetchUserOptionsByRole({
          role: "GERENTE_COMERCIAL",
          companyId: selectedCompanyId,
        });
        if (currentRequestId !== managersRequestIdRef.current) {
          return;
        }

        if (!options) {
          toast.error("Não foi possível carregar gerentes da empresa.");
          setManagerOptions([]);
          return;
        }

        setManagerOptions(options);
      } catch (error) {
        if (currentRequestId !== managersRequestIdRef.current) {
          return;
        }

        toast.error(parseApiError(error));
        setManagerOptions([]);
      } finally {
        if (currentRequestId === managersRequestIdRef.current) {
          setIsLoadingManagers(false);
        }
      }
    };

    void load();
  }, [authHydrated, selectedCompanyId, shouldShowManagerField]);

  React.useEffect(() => {
    if (!authHydrated || !shouldShowSupervisorField) {
      setSupervisorOptions([]);
      return;
    }

    const currentRequestId = ++supervisorsRequestIdRef.current;
    setIsLoadingSupervisors(true);

    const load = async () => {
      try {
        const options = await fetchUserOptionsByRole({
          role: "SUPERVISOR",
          ...(isAdminActor && selectedCompanyId
            ? { companyId: selectedCompanyId }
            : {}),
        });
        if (currentRequestId !== supervisorsRequestIdRef.current) {
          return;
        }

        if (!options) {
          toast.error("Não foi possível carregar supervisores.");
          setSupervisorOptions([]);
          return;
        }

        setSupervisorOptions(options);
      } catch (error) {
        if (currentRequestId !== supervisorsRequestIdRef.current) {
          return;
        }

        toast.error(parseApiError(error));
        setSupervisorOptions([]);
      } finally {
        if (currentRequestId === supervisorsRequestIdRef.current) {
          setIsLoadingSupervisors(false);
        }
      }
    };

    void load();
  }, [
    authHydrated,
    isAdminActor,
    selectedCompanyId,
    shouldShowSupervisorField,
  ]);

  const onSubmit = async (input: UpdateUserFormInput) => {
    if (!authUser || !userData) {
      toast.error("Não foi possível carregar o contexto para edição.");
      return;
    }

    const companyId = input.companyId?.trim() ?? "";
    const managerId = input.managerId?.trim() ?? "";
    const supervisorId = input.supervisorId?.trim() ?? "";
    const password = input.password?.trim() ?? "";

    if (shouldShowCompanyField && !companyId) {
      setError("companyId", {
        type: "manual",
        message: "Empresa obrigatória para este cargo.",
      });
      return;
    }

    if (shouldShowManagerField && !managerId) {
      setError("managerId", {
        type: "manual",
        message: "Selecione um gerente responsável.",
      });
      return;
    }

    if (shouldShowSupervisorField && !supervisorId) {
      setError("supervisorId", {
        type: "manual",
        message: "Selecione um supervisor responsável.",
      });
      return;
    }

    if (
      selectedRole === "ADMIN" &&
      userData.passwordStatus !== "SET" &&
      !password
    ) {
      setError("password", {
        type: "manual",
        message: "Senha obrigatória ao promover para admin.",
      });
      return;
    }

    try {
      const payload: Record<string, string | null> = {
        role: input.role,
        fullName: input.fullName.trim(),
        cpf: input.cpf.replace(/\D/g, ""),
        phone: input.phone.replace(/\D/g, ""),
      };

      const normalizedEmail = input.email?.trim();
      payload.email = normalizedEmail ? normalizedEmail : null;

      if (selectedRole === "ADMIN") {
        if (password) {
          payload.password = password;
        }
      }

      if (selectedRole !== "ADMIN" && isAdminActor) {
        payload.companyId = companyId;
      }

      if (selectedRole === "SUPERVISOR") {
        if (isAdminActor) {
          payload.managerId = managerId;
        }
      }

      if (selectedRole === "VENDEDOR") {
        if (isAdminActor) {
          payload.supervisorId = supervisorId;
        } else if (isManagerActor) {
          payload.supervisorId = supervisorId;
        }
      }

      const response = await apiFetch<unknown>(`/users/${userData.id}`, {
        method: "PATCH",
        body: payload,
      });

      const parsed = userDetailsApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao atualizar usuário.");
        return;
      }

      toast.success("Usuário atualizado com sucesso!");
      router.push(backHref);
    } catch (error) {
      toast.error(parseApiError(error));
    }
  };

  const handleDeleteUser = React.useCallback(async () => {
    if (!userData) {
      return;
    }

    const confirmed = window.confirm(
      `Confirma a exclusão do usuário "${userData.fullName}"? Esta ação é irreversível.`,
    );

    if (!confirmed) {
      return;
    }

    const deleted = await tryApiDelete(
      `/users/${userData.id}`,
      "Usuário excluído com sucesso.",
    );
    if (!deleted) {
      return;
    }

    router.push(backHref);
  }, [backHref, router, userData]);

  const handleReactivateUser = React.useCallback(async () => {
    if (!userData || userData.isActive) {
      return;
    }

    const confirmed = window.confirm(
      `Confirma reativar o usuário "${userData.fullName}"?`,
    );
    if (!confirmed) {
      return;
    }

    setIsReactivating(true);

    try {
      const response = await apiFetch<unknown>(`/users/${userData.id}`, {
        method: "PATCH",
        body: {
          isActive: true,
        },
      });

      const parsed = userDetailsApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao reativar usuário.");
        return;
      }

      setUserData(parsed.data.data);
      toast.success("Usuário reativado com sucesso!");
    } catch (error) {
      toast.error(parseApiError(error));
    } finally {
      setIsReactivating(false);
    }
  }, [userData]);

  if (!authHydrated || isLoadingUser) {
    return (
      <div className="w-full max-w-xl rounded-xl border bg-card p-5 shadow-xs">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-10 w-40" />
        </div>
      </div>
    );
  }

  if (!authUser || !userData) {
    return (
      <div className="rounded-xl border p-6 text-sm text-destructive">
        {loadError ?? "Não foi possível carregar dados do usuário."}
      </div>
    );
  }

  return (
    <form
      className="w-full max-w-xl rounded-xl border bg-card p-5 shadow-xs"
      onSubmit={handleSubmit(onSubmit)}
    >
      <FieldGroup className="gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-base font-semibold">
            {getUserInitials(watch("fullName") || userData.fullName)}
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-2xl font-semibold">
              {watch("fullName") || userData.fullName}
            </h4>
            <span
              className={
                userData.isActive
                  ? "inline-flex w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
                  : "inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
              }
            >
              {userData.isActive ? "Ativo" : "Inativo"}
            </span>
          </div>
        </div>

        <Field className="gap-2">
          <FieldLabel htmlFor="edit-user-full-name" className="font-semibold">
            Nome completo
          </FieldLabel>
          <Input
            id="edit-user-full-name"
            placeholder="Nome e sobrenome"
            {...register("fullName")}
            disabled={isSubmitting}
          />
          {errors.fullName ? (
            <p className="text-sm text-destructive">
              {errors.fullName.message}
            </p>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="edit-user-cpf" className="font-semibold">
            CPF
          </FieldLabel>
          <Input
            id="edit-user-cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={watch("cpf")}
            onChange={(event) =>
              setValue("cpf", formatCpfInput(event.target.value))
            }
            disabled={isSubmitting}
          />
          {errors.cpf ? (
            <p className="text-sm text-destructive">{errors.cpf.message}</p>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="edit-user-email" className="font-semibold">
            E-mail
          </FieldLabel>
          <Input
            id="edit-user-email"
            type="email"
            placeholder="nome@empresa.com.br"
            {...register("email")}
            disabled={isSubmitting}
          />
          {errors.email ? (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="edit-user-phone" className="font-semibold">
            Celular
          </FieldLabel>
          <Input
            id="edit-user-phone"
            inputMode="numeric"
            placeholder="(00) 99999-9990"
            value={watch("phone")}
            onChange={(event) =>
              setValue("phone", formatPhoneInput(event.target.value))
            }
            disabled={isSubmitting}
          />
          {errors.phone ? (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="edit-user-role" className="font-semibold">
            Cargo
          </FieldLabel>
          <select
            id="edit-user-role"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={selectedRole}
            onChange={(event) =>
              setValue("role", event.target.value as UserRole)
            }
            disabled={isSubmitting}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABEL_BY_VALUE[role]}
              </option>
            ))}
          </select>
          {errors.role ? (
            <p className="text-sm text-destructive">{errors.role.message}</p>
          ) : null}
        </Field>

        {shouldShowCompanyField ? (
          <Field className="gap-2">
            <FieldLabel htmlFor="edit-user-company" className="font-semibold">
              Empresa
            </FieldLabel>
            <select
              id="edit-user-company"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={selectedCompanyId ?? ""}
              onChange={(event) => setValue("companyId", event.target.value)}
              disabled={isSubmitting || isLoadingCompanies}
            >
              <option value="">Selecione a empresa</option>
              {companyOptions.map((companyOption) => (
                <option key={companyOption.id} value={companyOption.id}>
                  {companyOption.label}
                </option>
              ))}
            </select>
            {errors.companyId ? (
              <p className="text-sm text-destructive">
                {errors.companyId.message}
              </p>
            ) : null}
          </Field>
        ) : null}

        {shouldShowManagerField ? (
          <Field className="gap-2">
            <FieldLabel htmlFor="edit-user-manager" className="font-semibold">
              Gerente responsável
            </FieldLabel>
            <select
              id="edit-user-manager"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={watch("managerId") ?? ""}
              onChange={(event) => setValue("managerId", event.target.value)}
              disabled={isSubmitting || isLoadingManagers}
            >
              <option value="">Selecione o gerente</option>
              {managerOptions.map((managerOption) => (
                <option key={managerOption.id} value={managerOption.id}>
                  {managerOption.label}
                </option>
              ))}
            </select>
            {errors.managerId ? (
              <p className="text-sm text-destructive">
                {errors.managerId.message}
              </p>
            ) : null}
          </Field>
        ) : null}

        {shouldShowSupervisorField ? (
          <Field className="gap-2">
            <FieldLabel
              htmlFor="edit-user-supervisor"
              className="font-semibold"
            >
              Supervisor responsável
            </FieldLabel>
            <select
              id="edit-user-supervisor"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={watch("supervisorId") ?? ""}
              onChange={(event) => setValue("supervisorId", event.target.value)}
              disabled={isSubmitting || isLoadingSupervisors}
            >
              <option value="">Selecione o supervisor</option>
              {supervisorOptions.map((supervisorOption) => (
                <option key={supervisorOption.id} value={supervisorOption.id}>
                  {supervisorOption.label}
                </option>
              ))}
            </select>
            {errors.supervisorId ? (
              <p className="text-sm text-destructive">
                {errors.supervisorId.message}
              </p>
            ) : null}
          </Field>
        ) : null}

        {shouldShowPasswordField ? (
          <Field className="gap-2">
            <FieldLabel htmlFor="edit-user-password" className="font-semibold">
              Nova senha (opcional)
            </FieldLabel>
            <Input
              id="edit-user-password"
              type="password"
              placeholder="Deixe em branco para manter"
              {...register("password")}
              disabled={isSubmitting}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </Field>
        ) : null}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="inline-flex items-center">
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                Salvando
              </span>
            ) : (
              <>Salvar alterações</>
            )}
          </Button>

          {!userData.isActive ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                void handleReactivateUser();
              }}
              disabled={isSubmitting || isReactivating}
            >
              {isReactivating ? "Reativando..." : "Reativar usuário"}
            </Button>
          ) : null}

          {userData.isActive ? (
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => {
                void handleDeleteUser();
              }}
              disabled={isSubmitting || isReactivating}
            >
              Excluir usuário
            </Button>
          ) : null}
        </div>
      </FieldGroup>
    </form>
  );
}

