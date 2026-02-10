"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { EyeIcon, EyeOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { fetchMeUser, toAuthUser } from "@/lib/auth-me";
import { tryApiPatch } from "@/lib/try-api";
import {
  meApiResponseSchema,
  profileSchema,
  type MeUser,
  type ProfileSchema,
} from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";

const roleLabelMap = {
  ADMIN: "Administrador",
  GERENTE_COMERCIAL: "Gerente Comercial",
  SUPERVISOR: "Supervisor",
} as const;

export function ProfileForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const hydrated = useAuthStore((state) => state.hydrated);
  const setUser = useAuthStore((state) => state.setUser);
  const clear = useAuthStore((state) => state.clear);

  const [profileUser, setProfileUser] = React.useState<MeUser | null>(null);
  const [loadingProfile, setLoadingProfile] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "",
      email: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    if (!hydrated) return;

    let mounted = true;

    const loadProfile = async () => {
      const result = await fetchMeUser();
      if (!mounted) return;

      if (result.kind === "invalid_session") {
        clear();
        router.replace("/login");
        return;
      }

      if (result.kind === "success") {
        setProfileUser(result.user);
        setUser(toAuthUser(result.user));
        reset({
          fullName: result.user.fullName,
          email: result.user.email ?? "",
          newPassword: "",
          confirmPassword: "",
        });
      }

      setLoadingProfile(false);
    };

    void loadProfile();

    return () => {
      mounted = false;
    };
  }, [hydrated, reset, setUser, clear, router]);

  const onSubmit = async (data: ProfileSchema) => {
    if (!profileUser) return;

    const nextFullName = data.fullName.trim();
    const nextEmail = data.email.trim();
    const nextPassword = data.newPassword.trim();

    const payload: Record<string, string> = {};

    if (nextFullName !== profileUser.fullName) {
      payload.fullName = nextFullName;
    }

    if (nextEmail !== (profileUser.email ?? "")) {
      payload.email = nextEmail;
    }

    if (nextPassword.length > 0) {
      payload.newPassword = nextPassword;
    }

    if (Object.keys(payload).length === 0) {
      toast("Nenhuma alteração para salvar.");
      return;
    }

    setSaving(true);

    try {
      const response = await tryApiPatch<unknown>(
        "/me",
        payload,
        "Perfil atualizado com sucesso!",
      );

      if (!response) {
        return;
      }

      const parsed = meApiResponseSchema.safeParse(response);
      if (!parsed.success) {
        toast.error("Resposta inesperada da API.");
        return;
      }

      const updatedUser = parsed.data.data;
      setProfileUser(updatedUser);
      setUser(toAuthUser(updatedUser));

      reset({
        fullName: updatedUser.fullName,
        email: updatedUser.email ?? "",
        newPassword: "",
        confirmPassword: "",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || loadingProfile) {
    return (
      <div className="flex flex-col gap-6 py-6 lg:w-[40%] ">
        <div className="flex w-full flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="rounded-xl py-6 text-sm text-muted-foreground">
        Não foi possível carregar o perfil.
      </div>
    );
  }

  const roleLabel = roleLabelMap[profileUser.role];

  return (
    <div className="flex flex-col gap-6 py-6 lg:w-full ">
      <form onSubmit={handleSubmit(onSubmit)}>
        <FieldGroup className="gap-0">
          <Field className="mb-4 gap-2">
            <FieldLabel htmlFor="fullName" className="font-bold">
              Nome completo
            </FieldLabel>
            <Input id="fullName" {...register("fullName")} required />
            {errors.fullName && (
              <p className="text-sm text-red-500">{errors.fullName.message}</p>
            )}
          </Field>

          <Field className="mb-4 gap-2">
            <FieldLabel htmlFor="email" className="font-bold">
              E-mail
            </FieldLabel>
            <Input id="email" type="email" {...register("email")} required />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </Field>

          <Field className="mb-4 gap-2">
            <FieldLabel htmlFor="newPassword" className="font-bold">
              Nova senha (opcional)
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="*********"
                autoComplete="new-password"
                {...register("newPassword")}
              />
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hover:bg-transparent"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeIcon /> : <EyeOffIcon />}
                </Button>
              </InputGroupAddon>
            </InputGroup>
            {errors.newPassword && (
              <p className="text-sm text-red-500">
                {errors.newPassword.message}
              </p>
            )}
          </Field>

          <Field className="mb-4 gap-2">
            <FieldLabel htmlFor="confirmPassword" className="font-bold">
              Confirmar nova senha
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="*********"
                autoComplete="new-password"
                {...register("confirmPassword")}
              />
              <InputGroupAddon align="inline-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hover:bg-transparent"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                >
                  {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
                </Button>
              </InputGroupAddon>
            </InputGroup>
            {errors.confirmPassword && (
              <p className="text-sm text-red-500">
                {errors.confirmPassword.message}
              </p>
            )}
            <FieldDescription>
              Preencha senha e confirmação apenas se quiser alterar a senha
              atual.
            </FieldDescription>
          </Field>

          <Field className="mt-4 gap-2 w-min">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <span className="inline-flex items-center">
                  <Spinner className="mr-2 h-4 w-4 animate-spin" />
                  Salvando
                </span>
              ) : (
                "Salvar alterações"
              )}
            </Button>
          </Field>
        </FieldGroup>
      </form>
    </div>
  );
}
