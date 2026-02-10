"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";

import {
  activateAccountSchema,
  loginResponseSchema,
  type ActivateAccountSchema,
} from "@/schemas/auth";
import { tryApiPostDataParsed } from "@/lib/try-api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { PasswordField } from "@/components/ui/password-field";
import { Spinner } from "@/components/ui/spinner";

export function ActivateAccountForm({ className, ...props }: React.ComponentProps<"form">) {
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
  } = useForm<ActivateAccountSchema>({
    resolver: zodResolver(activateAccountSchema),
    defaultValues: {
      token: tokenFromUrl,
      password: "",
      confirmPassword: "",
    },
  });

  React.useEffect(() => {
    setValue("token", tokenFromUrl, { shouldValidate: true });
  }, [tokenFromUrl, setValue]);

  const password = watch("password", "");
  const confirmPassword = watch("confirmPassword", "");
  const isSubmitEnabled =
    tokenFromUrl.length > 0 &&
    password.trim().length > 0 &&
    confirmPassword.trim().length > 0;

  const onSubmit = async (data: ActivateAccountSchema) => {
    setLoading(true);

    try {
      const session = await tryApiPostDataParsed(
        "/auth/activate-account",
        {
          token: data.token,
          password: data.password,
        },
        (payload) => {
          const parsed = loginResponseSchema.safeParse(payload);
          return parsed.success ? parsed.data : null;
        },
        "Conta ativada com sucesso!",
        "Não foi possível ativar a conta.",
      );

      if (!session) {
        return;
      }

      router.push("/dashboard");
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
          <h1 className="text-3xl font-bold">Ative sua conta</h1>
          <p className="text-muted-foreground text-sm text-balance">
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
          id="confirmPassword"
          label="Confirmar senha"
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
                Ativando
              </span>
            ) : (
              "Ativar"
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
