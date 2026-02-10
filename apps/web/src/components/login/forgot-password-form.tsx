"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import React from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authOkSchema, forgotSchema, type ForgotSchema } from "@/schemas/auth";
import { tryApiPostDataParsed } from "@/lib/try-api";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ForgotSchema>({
    resolver: zodResolver(forgotSchema),
    defaultValues: {
      email: "",
    },
  });

  const email = watch("email", "");
  const isSubmitEnabled = email.trim().length > 0;

  const onSubmit = async (data: ForgotSchema) => {
    setLoading(true);

    try {
      const result = await tryApiPostDataParsed(
        "/auth/forgot-password",
        data,
        (payload) => {
          const parsed = authOkSchema.safeParse(payload);
          return parsed.success ? parsed.data : null;
        },
        "Se o e-mail existir, enviaremos as instruções de recuperação.",
        "Não foi possível processar a solicitação.",
      );

      if (!result?.ok) {
        return;
      }

      reset();
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
        <div className="flex gap-6 flex-col items-center text-center mb-16">
          <h1 className="text-3xl font-bold">Esqueceu sua senha?</h1>
          <p className="text-muted-foreground text-sm text-balance">
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
          <Button
            type="submit"
            disabled={!isSubmitEnabled || loading}
            className="disabled:bg-zinc-400 disabled:text-white disabled:opacity-100"
          >
            {loading ? (
              <span className="inline-flex items-center">
                <Spinner className="w-4 h-4 mr-2 animate-spin" />
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
