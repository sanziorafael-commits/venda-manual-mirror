"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";

import { authOkSchema, resetPasswordSchema, type ResetPasswordSchema } from "@/schemas/auth";
import { tryApiPostDataParsed } from "@/lib/try-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { Spinner } from "@/components/ui/spinner";

export function ResetPasswordForm({ className, ...props }: React.ComponentProps<"form">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";

  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ResetPasswordSchema>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl,
      newPassword: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    setValue("token", tokenFromUrl, { shouldValidate: true });
  }, [tokenFromUrl, setValue]);

  const password = watch("newPassword", "");
  const confirmPassword = watch("confirmPassword", "");
  const isSubmitEnabled =
    tokenFromUrl.length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0;

  const onSubmit = async (data: ResetPasswordSchema) => {
    setLoading(true);

    try {
      const result = await tryApiPostDataParsed(
        "/auth/reset-password",
        {
          token: data.token,
          password: data.newPassword,
        },
        (payload) => {
          const parsed = authOkSchema.safeParse(payload);
          return parsed.success ? parsed.data : null;
        },
        "Senha redefinida com sucesso!",
        "Não foi possível redefinir a senha.",
      );

      if (!result?.ok) {
        return;
      }

      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      {...props}
      className={cn("flex flex-col gap-6", className)}
      onSubmit={handleSubmit(onSubmit)}
    >
      <FieldGroup className="gap-0">
        <div className="mb-16 flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-bold">Criar nova senha</h1>
          <p className="text-muted-foreground text-sm text-balance">
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
          id="newPassword"
          label="Nova senha"
          registration={register("newPassword")}
          autoComplete="new-password"
          required
          error={errors.newPassword?.message}
        />

        <PasswordField
          id="confirmPassword"
          label="Confirmar nova senha"
          registration={register("confirmPassword")}
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
        />

        <Field className="mb-6 mt-6 gap-2">
          <Button
            type="submit"
            disabled={!isSubmitEnabled || loading}
            className="disabled:bg-zinc-400 disabled:text-white disabled:opacity-100"
          >
            {loading ? (
              <span className="inline-flex items-center">
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                Enviando
              </span>
            ) : (
              "Enviar"
            )}
          </Button>
        </Field>

        <FieldDescription className="text-center [&>a]:no-underline">
          Lembrou sua senha? <Link href="/login">Voltar ao login</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
