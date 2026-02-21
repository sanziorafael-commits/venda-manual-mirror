"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useAuthHydrated, useAuthUser } from "@/hooks/use-auth-user";
import { apiFetch } from "@/lib/api-client";
import { parseApiError } from "@/lib/api-error";
import { formatPhoneInput } from "@/lib/phone";
import {
  companiesApiResponseSchema,
  type CompanyListItem,
} from "@/schemas/company";
import {
  createUserFormSchema,
  createdUserApiResponseSchema,
  usersApiResponseSchema,
  type CreateUserFormInput,
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

type UserCreateFormProps = {
  prefilledCompanyId?: string | null;
};

const ROLE_LABEL_BY_VALUE: Record<UserRole, string> = {
  ADMIN: "Admin",
  DIRETOR: "Diretor",
  GERENTE_COMERCIAL: "Gerente Comercial",
  SUPERVISOR: "Supervisor",
  VENDEDOR: "Vendedor",
};

function getAllowedRoleOptions(actorRole: UserRole): UserRole[] {
  if (actorRole === "ADMIN") {
    return ["ADMIN", "DIRETOR", "GERENTE_COMERCIAL", "SUPERVISOR", "VENDEDOR"];
  }

  if (actorRole === "DIRETOR") {
    return ["GERENTE_COMERCIAL", "SUPERVISOR", "VENDEDOR"];
  }

  if (actorRole === "GERENTE_COMERCIAL") {
    return ["SUPERVISOR", "VENDEDOR"];
  }

  return ["VENDEDOR"];
}

function getDefaultRole(actorRole: UserRole): UserRole {
  if (actorRole === "ADMIN") {
    return "GERENTE_COMERCIAL";
  }

  if (actorRole === "DIRETOR") {
    return "GERENTE_COMERCIAL";
  }

  if (actorRole === "GERENTE_COMERCIAL") {
    return "SUPERVISOR";
  }

  return "VENDEDOR";
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

async function fetchAllCompaniesForSelect(): Promise<SelectOption[] | null> {
  let page = 1;
  let total_pages = 1;
  const options: SelectOption[] = [];

  while (page <= total_pages) {
    const response = await apiFetch<unknown>(
      `/companies?page=${page}&page_size=${COMPANIES_PAGE_SIZE}`,
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

    total_pages = parsed.data.meta.total_pages;
    page += 1;
  }

  return options;
}

async function fetchUserOptionsByRole(input: {
  role: UserRole;
  company_id?: string;
}): Promise<SelectOption[] | null> {
  let page = 1;
  let total_pages = 1;
  const options: SelectOption[] = [];

  while (page <= total_pages) {
    const params = new URLSearchParams();
    params.set("role", input.role);
    params.set("is_active", "true");
    params.set("page", String(page));
    params.set("page_size", String(USERS_OPTIONS_PAGE_SIZE));

    if (input.company_id) {
      params.set("company_id", input.company_id);
    }

    const response = await apiFetch<unknown>(`/users?${params.toString()}`);
    const parsed = usersApiResponseSchema.safeParse(response);
    if (!parsed.success) {
      return null;
    }

    options.push(
      ...parsed.data.data.map((user: UserListItem) => ({
        id: user.id,
        label: user.full_name,
      })),
    );

    total_pages = parsed.data.meta.total_pages;
    page += 1;
  }

  return options;
}

export function UserCreateForm({ prefilledCompanyId = null }: UserCreateFormProps) {
  const router = useRouter();
  const authUser = useAuthUser();
  const authHydrated = useAuthHydrated();
  const setupDoneRef = React.useRef(false);
  const companiesRequestIdRef = React.useRef(0);
  const managersRequestIdRef = React.useRef(0);
  const supervisorsRequestIdRef = React.useRef(0);

  const [company_options, setCompanyOptions] = React.useState<SelectOption[]>([]);
  const [managerOptions, setManagerOptions] = React.useState<SelectOption[]>([]);
  const [supervisorOptions, setSupervisorOptions] = React.useState<SelectOption[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = React.useState(false);
  const [isLoadingManagers, setIsLoadingManagers] = React.useState(false);
  const [isLoadingSupervisors, setIsLoadingSupervisors] = React.useState(false);
  const prefilledCompanyIdValue = React.useMemo(() => {
    const value = prefilledCompanyId?.trim() ?? "";
    return value.length > 0 ? value : "";
  }, [prefilledCompanyId]);

  const {
    register,
    watch,
    reset,
    setValue,
    setError,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserFormInput>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      full_name: "",
      cpf: "",
      email: "",
      phone: "",
      role: "VENDEDOR",
      company_id: "",
      password: "",
      manager_id: "",
      supervisor_id: "",
    },
  });

  const selectedRole = watch("role");
  const selectedCompanyId = watch("company_id");
  const actorRole = authUser?.role ?? null;
  const isAdminActor = actorRole === "ADMIN";
  const isDirectorActor = actorRole === "DIRETOR";
  const isManagerActor = actorRole === "GERENTE_COMERCIAL";
  const canUseCompanyScopeFilters =
    (isAdminActor || isDirectorActor) && Boolean(selectedCompanyId);
  const shouldShowCompanyField = isAdminActor && selectedRole !== "ADMIN";
  const shouldShowManagerField =
    selectedRole === "SUPERVISOR" && canUseCompanyScopeFilters;
  const shouldShowSupervisorField =
    selectedRole === "VENDEDOR" && (canUseCompanyScopeFilters || isManagerActor);
  const shouldShowPasswordField = selectedRole === "ADMIN";

  const roleOptions = React.useMemo<UserRole[]>(() => {
    if (!actorRole) {
      return ["VENDEDOR"];
    }

    return getAllowedRoleOptions(actorRole);
  }, [actorRole]);

  React.useEffect(() => {
    if (!authHydrated || !authUser || setupDoneRef.current) {
      return;
    }

    const defaultRole = getDefaultRole(authUser.role);
    reset({
      full_name: "",
      cpf: "",
      email: "",
      phone: "",
      role: defaultRole,
      company_id:
        authUser.role === "ADMIN"
          ? prefilledCompanyIdValue
          : (authUser.company_id ?? ""),
      password: "",
      manager_id: "",
      supervisor_id: "",
    });

    setupDoneRef.current = true;
  }, [authHydrated, authUser, prefilledCompanyIdValue, reset]);

  React.useEffect(() => {
    if (selectedRole !== "SUPERVISOR") {
      setValue("manager_id", "");
    }

    if (selectedRole !== "VENDEDOR") {
      setValue("supervisor_id", "");
    }

    if (selectedRole !== "ADMIN") {
      setValue("password", "");
    }

    if (isAdminActor && !shouldShowCompanyField) {
      setValue("company_id", "");
    }
  }, [isAdminActor, selectedRole, setValue, shouldShowCompanyField]);

  React.useEffect(() => {
    if (!isAdminActor) {
      return;
    }

    setValue("manager_id", "");
    setValue("supervisor_id", "");
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
          toast.error("N�o foi poss�vel carregar empresas.");
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
          company_id: selectedCompanyId,
        });
        if (currentRequestId !== managersRequestIdRef.current) {
          return;
        }

        if (!options) {
          toast.error("N�o foi poss�vel carregar gerentes da empresa.");
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
          ...((isAdminActor || isDirectorActor) && selectedCompanyId
            ? { company_id: selectedCompanyId }
            : {}),
        });
        if (currentRequestId !== supervisorsRequestIdRef.current) {
          return;
        }

        if (!options) {
          toast.error("N�o foi poss�vel carregar supervisores.");
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
    isDirectorActor,
    selectedCompanyId,
    shouldShowSupervisorField,
  ]);

  const onSubmit = async (input: CreateUserFormInput) => {
    if (!authUser) {
      toast.error("N�o foi poss�vel identificar o usu�rio autenticado.");
      return;
    }

    const company_id = input.company_id?.trim() ?? "";
    const manager_id = input.manager_id?.trim() ?? "";
    const supervisor_id = input.supervisor_id?.trim() ?? "";

    if (shouldShowCompanyField && !company_id) {
      setError("company_id", {
        type: "manual",
        message: "Empresa obrigat�ria para este cargo.",
      });
      return;
    }

    if (shouldShowManagerField && !manager_id) {
      setError("manager_id", {
        type: "manual",
        message: "Selecione um Gerente respons�vel.",
      });
      return;
    }

    if (shouldShowSupervisorField && !supervisor_id) {
      setError("supervisor_id", {
        type: "manual",
        message: "Selecione um Supervisor respons�vel.",
      });
      return;
    }

    try {
      const payload: Record<string, string> = {
        role: input.role,
        full_name: input.full_name.trim(),
        cpf: input.cpf.replace(/\D/g, ""),
        phone: input.phone.replace(/\D/g, ""),
      };

      const normalizedEmail = input.email?.trim();
      if (normalizedEmail) {
        payload.email = normalizedEmail;
      }

      if (input.role === "ADMIN") {
        payload.password = input.password?.trim() ?? "";
      }

      if (isAdminActor && input.role !== "ADMIN") {
        payload.company_id = company_id;
      }

      if ((isAdminActor || isDirectorActor) && input.role === "SUPERVISOR") {
        payload.manager_id = manager_id;
      }

      if ((isAdminActor || isDirectorActor || isManagerActor) && input.role === "VENDEDOR") {
        payload.supervisor_id = supervisor_id;
      }

      const response = await apiFetch<unknown>("/users", {
        method: "POST",
        body: payload,
      });

      const parsed = createdUserApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada ao Cadastrar usu�rio.");
        return;
      }

      toast.success("usu�rio cadastrado com sucesso!");
      router.push("/dashboard/users");
    } catch (error) {
      toast.error(parseApiError(error));
    }
  };

  if (!authHydrated) {
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

  if (!authUser) {
    return (
      <div className="rounded-xl border p-6 text-sm text-destructive">
        N�o foi poss�vel carregar o contexto do usu�rio autenticado.
      </div>
    );
  }

  return (
    <form
      className="w-full max-w-xl rounded-xl border bg-card p-5 shadow-xs"
      onSubmit={handleSubmit(onSubmit)}
    >
      <FieldGroup className="gap-4">
        <h4 className="text-2xl font-semibold">Novo usu�rio</h4>

        <Field className="gap-2">
          <FieldLabel htmlFor="user-full-name" className="font-semibold">
            Nome completo
          </FieldLabel>
          <Input
            id="user-full-name"
            placeholder="Nome e sobrenome"
            {...register("full_name")}
            disabled={isSubmitting}
          />
          {errors.full_name ? (
            <p className="text-sm text-destructive">{errors.full_name.message}</p>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="user-cpf" className="font-semibold">
            CPF
          </FieldLabel>
          <Input
            id="user-cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            value={watch("cpf")}
            onChange={(event) => setValue("cpf", formatCpfInput(event.target.value))}
            disabled={isSubmitting}
          />
          {errors.cpf ? (
            <p className="text-sm text-destructive">{errors.cpf.message}</p>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="user-email" className="font-semibold">
            E-mail
          </FieldLabel>
          <Input
            id="user-email"
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
          <FieldLabel htmlFor="user-phone" className="font-semibold">
            Celular
          </FieldLabel>
          <Input
            id="user-phone"
            inputMode="numeric"
            placeholder="+55 (00) 99999-9999"
            value={watch("phone")}
            onChange={(event) => setValue("phone", formatPhoneInput(event.target.value))}
            disabled={isSubmitting}
          />
          {errors.phone ? (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          ) : null}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="user-role" className="font-semibold">
            Cargo
          </FieldLabel>
          <select
            id="user-role"
            className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            value={selectedRole}
            onChange={(event) => setValue("role", event.target.value as UserRole)}
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
            <FieldLabel htmlFor="user-company" className="font-semibold">
              Empresa
            </FieldLabel>
            <select
              id="user-company"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={selectedCompanyId ?? ""}
              onChange={(event) => setValue("company_id", event.target.value)}
              disabled={isSubmitting || isLoadingCompanies}
            >
              <option value="">Selecione a empresa</option>
              {company_options.map((companyOption) => (
                <option key={companyOption.id} value={companyOption.id}>
                  {companyOption.label}
                </option>
              ))}
            </select>
            {errors.company_id ? (
              <p className="text-sm text-destructive">{errors.company_id.message}</p>
            ) : null}
          </Field>
        ) : null}

        {shouldShowManagerField ? (
          <Field className="gap-2">
            <FieldLabel htmlFor="user-manager" className="font-semibold">
              Gerente respons�vel
            </FieldLabel>
            <select
              id="user-manager"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={watch("manager_id") ?? ""}
              onChange={(event) => setValue("manager_id", event.target.value)}
              disabled={isSubmitting || isLoadingManagers}
            >
              <option value="">Selecione o gerente</option>
              {managerOptions.map((managerOption) => (
                <option key={managerOption.id} value={managerOption.id}>
                  {managerOption.label}
                </option>
              ))}
            </select>
            {errors.manager_id ? (
              <p className="text-sm text-destructive">{errors.manager_id.message}</p>
            ) : null}
          </Field>
        ) : null}

        {shouldShowSupervisorField ? (
          <Field className="gap-2">
            <FieldLabel htmlFor="user-supervisor" className="font-semibold">
              Supervisor respons�vel
            </FieldLabel>
            <select
              id="user-supervisor"
              className="border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
              value={watch("supervisor_id") ?? ""}
              onChange={(event) => setValue("supervisor_id", event.target.value)}
              disabled={isSubmitting || isLoadingSupervisors}
            >
              <option value="">Selecione o supervisor</option>
              {supervisorOptions.map((supervisorOption) => (
                <option key={supervisorOption.id} value={supervisorOption.id}>
                  {supervisorOption.label}
                </option>
              ))}
            </select>
            {errors.supervisor_id ? (
              <p className="text-sm text-destructive">{errors.supervisor_id.message}</p>
            ) : null}
          </Field>
        ) : null}

        {shouldShowPasswordField ? (
          <Field className="gap-2">
            <FieldLabel htmlFor="user-password" className="font-semibold">
              Senha
            </FieldLabel>
            <Input
              id="user-password"
              type="password"
              placeholder="Senha do admin"
              {...register("password")}
              disabled={isSubmitting}
            />
            {errors.password ? (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            ) : null}
          </Field>
        ) : null}

        <div className="pt-1">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <span className="inline-flex items-center">
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                Cadastrando
              </span>
            ) : (
              <>Cadastrar usu�rio</>
            )}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}


