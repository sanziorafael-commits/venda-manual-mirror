"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import React from "react";
import { useForm, useWatch } from "react-hook-form";

import { AuthSubmitButton } from "@/components/auth/auth-submit-button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useAuthSubmit } from "@/hooks/use-auth-submit";
import { cn } from "@/lib/utils";
import { authOkSchema, forgotSchema, type ForgotSchema } from "@/schemas/auth";

type AuthOkResult = {
  ok: boolean;
};

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ForgotSchema>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: "",
    },
  });

  const email = useWatch({ control, name: "email", defaultValue: "" });
  const isSubmitEnabled = email.trim().length > 0;

  const { loading, submit } = useAuthSubmit<ForgotSchema, AuthOkResult>({
    path: "/auth/forgot-password",
    parseData: (payload) => {
      const parsed = authOkSchema.safeParse(payload);
      return parsed.success ? parsed.data : null;
    },
    successMessage:
      "Se o e-mail existir, enviaremos as instruções de recuperação.",
    invalidMessage: "Não foi possível processar a solicitação.",
    onSuccess: (result) => {
      if (result.ok) {
        reset();
      }
    },
  });

  const onSubmit = React.useCallback(
    async (data: ForgotSchema) => {
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
        <div className="flex gap-6 flex-col items-center text-center mb-16">
          <h1 className="text-3xl font-bold">Esqueceu sua senha?</h1>
          <p className="text-[#798E99] text-sm text-balance">
            Entre com seu e-mail e enviaremos um link para redefinir sua senha
          </p>
        </div>
        <Field className="gap-2">
          <FieldLabel htmlFor="email" className="font-bold">
            E-mail
          </FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="email@email.com"
            autoComplete="email"
            {...register("email")}
            required
          />
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          )}
        </Field>
        <Field className="gap-2 mt-6 mb-6">
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

