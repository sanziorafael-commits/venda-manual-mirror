"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { toAuthUser } from "@/lib/auth-me";
import { tryApiPatch } from "@/lib/try-api";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import {
  meApiResponseSchema,
  profileSchema,
  type ProfileSchema,
} from "@/schemas/auth";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

type ProfileFormProps = {
  className?: string;
};

export function ProfileForm({ className }: ProfileFormProps) {
  const {
    data: profileUser,
    hydrated,
    isLoading,
    error,
    setData,
  } = useProfile();
  const setUser = useAuthStore((state) => state.setUser);
  const [saving, setSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileSchema>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: "",
      email: "",
      new_password: "",
      confirm_password: "",
    },
  });

  React.useEffect(() => {
    if (!profileUser) {
      return;
    }

    reset({
      full_name: profileUser.full_name,
      email: profileUser.email ?? "",
      new_password: "",
      confirm_password: "",
    });
  }, [profileUser, reset]);

  const onSubmit = async (data: ProfileSchema) => {
    if (!profileUser) {
      return;
    }

    const payload: Record<string, string> = {};
    const nextFullName = data.full_name.trim();
    const nextEmail = data.email.trim();
    const nextPassword = data.new_password.trim();

    if (nextFullName !== profileUser.full_name) {
      payload.full_name = nextFullName;
    }

    if (nextEmail !== (profileUser.email ?? "")) {
      payload.email = nextEmail;
    }

    if (nextPassword.length > 0) {
      payload.new_password = nextPassword;
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
      setData(updatedUser);
      setUser(toAuthUser(updatedUser));

      reset({
        full_name: updatedUser.full_name,
        email: updatedUser.email ?? "",
        new_password: "",
        confirm_password: "",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!hydrated || isLoading) {
    return (
      <div className="flex flex-col gap-6 py-6">
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
        {error ?? "Não foi possível carregar o perfil."}
      </div>
    );
  }

  return (
    <form
      className={cn("flex flex-col gap-6 py-6", className)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <FieldGroup className="gap-0">
        <Field className="mb-4 gap-2">
          <FieldLabel htmlFor="full_name" className="font-bold">
            Nome completo
          </FieldLabel>
          <Input id="full_name" {...register("full_name")} required />
          {errors.full_name ? (
            <p className="text-sm text-red-500">{errors.full_name.message}</p>
          ) : null}
        </Field>

        <Field className="mb-4 gap-2">
          <FieldLabel htmlFor="email" className="font-bold">
            E-mail
          </FieldLabel>
          <Input id="email" type="email" {...register("email")} required />
          {errors.email ? (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          ) : null}
        </Field>

        <PasswordField
          className="mb-4"
          id="new_password"
          label="Nova senha (opcional)"
          registration={register("new_password")}
          autoComplete="new-password"
          error={errors.new_password?.message}
        />

        <PasswordField
          className="mb-4"
          id="confirm_password"
          label="Confirmar nova senha"
          registration={register("confirm_password")}
          autoComplete="new-password"
          error={errors.confirm_password?.message}
          description="Preencha senha e confirmação apenas se quiser alterar a senha atual."
        />

        <Field className="mt-4 w-min gap-2">
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
  );
}

