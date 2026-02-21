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
  authOkSchema,
  resetPasswordSchema,
  type ResetPasswordSchema,
} from "@/schemas/auth";
import { cn } from "@/lib/utils";

type AuthOkResult = {
  ok: boolean;
};

export function ResetPasswordForm({
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
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl,
      new_password: "",
      confirm_password: "",
    },
  });

  React.useEffect(() => {
    setValue("token", tokenFromUrl, { shouldValidate: true });
  }, [tokenFromUrl, setValue]);

  const password = useWatch({ control, name: "new_password", defaultValue: "" });
  const confirm_password = useWatch({
    control,
    name: "confirm_password",
    defaultValue: "",
  });
  const isSubmitEnabled =
    tokenFromUrl.length > 0 &&
    password.trim().length > 0 &&
    confirm_password.trim().length > 0;

  const { loading, submit } = useAuthSubmit<ResetPasswordSchema, AuthOkResult>({
    path: "/auth/reset-password",
    buildBody: (data) => ({
      token: data.token,
      password: data.new_password,
    }),
    parseData: (payload) => {
      const parsed = authOkSchema.safeParse(payload);
      return parsed.success ? parsed.data : null;
    },
    successMessage: "Senha redefinida com sucesso!",
    invalidMessage: "Não foi possível redefinir a senha.",
    onSuccess: (result) => {
      if (result.ok) {
        router.push("/login");
      }
    },
  });

  const onSubmit = React.useCallback(
    async (data: ResetPasswordSchema) => {
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
          <h1 className="text-3xl font-bold">Criar nova senha</h1>
          <p className="text-[#798E99] text-sm text-balance">
            Digite sua nova senha e confirme para redefinir sua conta
          </p>
          {!tokenFromUrl ? (
            <p className="text-sm text-red-500">
              Link inválido ou expirado. Solicite um novo e-mail.
            </p>
          ) : null}
        </div>

        <PasswordField
          className="mb-6"
          id="new_password"
          label="Nova senha"
          registration={register("new_password")}
          autoComplete="new-password"
          required
          error={errors.new_password?.message}
        />

        <PasswordField
          id="confirm_password"
          label="Confirmar nova senha"
          registration={register("confirm_password")}
          autoComplete="new-password"
          required
          error={errors.confirm_password?.message}
        />

        <Field className="mb-6 mt-6 gap-2">
          <AuthSubmitButton
            loading={loading}
            idleLabel="Enviar"
            loadingLabel="Enviando"
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

