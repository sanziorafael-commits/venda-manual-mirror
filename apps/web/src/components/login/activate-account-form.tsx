"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm, useWatch } from "react-hook-form";

import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { useAuthSubmit } from "@/hooks/use-auth-submit";
import { useUrlToken } from "@/hooks/use-url-token";
import {
  activateAccountSchema,
  loginResponseSchema,
  type ActivateAccountSchema,
  type LoginResponse,
} from "@/schemas/auth";
import { cn } from "@/lib/utils";

export function ActivateAccountForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const tokenFromUrl = useUrlToken();

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<ActivateAccountSchema>({
    resolver: zodResolver(activateAccountSchema),
    defaultValues: {
      token: tokenFromUrl,
      password: "",
      confirm_password: "",
    },
  });

  React.useEffect(() => {
    setValue("token", tokenFromUrl, { shouldValidate: true });
  }, [tokenFromUrl, setValue]);

  const password = useWatch({ control, name: "password", defaultValue: "" });
  const confirm_password = useWatch({
    control,
    name: "confirm_password",
    defaultValue: "",
  });
  const isSubmitEnabled =
    tokenFromUrl.length > 0 &&
    password.trim().length > 0 &&
    confirm_password.trim().length > 0;

  const { loading, submit } = useAuthSubmit<ActivateAccountSchema, LoginResponse>({
    path: "/auth/activate-account",
    buildBody: (data) => ({
      token: data.token,
      password: data.password,
    }),
    parseData: (payload) => {
      const parsed = loginResponseSchema.safeParse(payload);
      return parsed.success ? parsed.data : null;
    },
    successMessage: "Conta ativada com sucesso!",
    invalidMessage: "Não foi possível ativar a conta.",
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  const onSubmit = React.useCallback(
    async (data: ActivateAccountSchema) => {
      await submit(data);
    },
    [submit],
  );

  return (
    <form
      {...props}
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <FieldGroup className="gap-0">
        <div className="mb-16 flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-bold">Ative sua conta</h1>
          <p className="text-[#798E99] text-sm text-balance">
            Digite sua senha e confirme para ativar sua conta
          </p>
          {!tokenFromUrl ? (
            <p className="text-sm text-red-500">
              Link inválido ou expirado. Solicite um novo convite.
            </p>
          ) : null}
        </div>

        <PasswordField
          className="mb-6"
          id="password"
          label="Senha"
          registration={register("password")}
          autoComplete="new-password"
          required
          error={errors.password?.message}
        />

        <PasswordField
          id="confirm_password"
          label="Confirmar senha"
          registration={register("confirm_password")}
          autoComplete="new-password"
          required
          error={errors.confirm_password?.message}
        />

        <Field className="mb-6 mt-6 gap-2">
          <AuthSubmitButton
            loading={loading}
            idleLabel="Ativar"
            loadingLabel="Ativando"
            disabled={!isSubmitEnabled}
          />
        </Field>

        <FieldDescription className="text-center [&>a]:no-underline">
          Lembrou sua senha? <Link href="/login">Voltar ao login</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}

