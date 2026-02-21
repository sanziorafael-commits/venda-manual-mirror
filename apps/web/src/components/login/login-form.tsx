"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { PasswordField } from "@/components/ui/password-field";
import { useAuthSubmit } from "@/hooks/use-auth-submit";
import { cn } from "@/lib/utils";
import {
  loginResponseSchema,
  loginSchema,
  type LoginResponse,
  type LoginSchema,
} from "@/schemas/auth";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const email = useWatch({ control, name: "email", defaultValue: "" });
  const password = useWatch({ control, name: "password", defaultValue: "" });
  const isSubmitEnabled = email.trim().length > 0 && password.trim().length > 0;

  const { loading, submit } = useAuthSubmit<LoginSchema, LoginResponse>({
    path: "/auth/login",
    parseData: (payload) => {
      const parsed = loginResponseSchema.safeParse(payload);
      return parsed.success ? parsed.data : null;
    },
    successMessage: "Login realizado com sucesso!",
    invalidMessage: "Não foi possível concluir o login. Tente novamente.",
    onSuccess: () => {
      router.push("/dashboard");
    },
  });

  const onSubmit = React.useCallback(
    async (data: LoginSchema) => {
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
        <Field className="mb-6 gap-2">
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
          {errors.email ? (
            <p className="text-sm text-red-500">{errors.email.message}</p>
          ) : null}
        </Field>

        <PasswordField
          className="mb-3"
          id="password"
          label="Senha"
          registration={register("password")}
          autoComplete="current-password"
          required
          error={errors.password?.message}
        />

        <FieldDescription className="text-right [&>a]:no-underline">
          <Link href="/login/forgot-password" className="text-xs">
            Esqueceu sua senha?
          </Link>
        </FieldDescription>

        <Field className="mt-6 gap-2">
          <AuthSubmitButton
            loading={loading}
            idleLabel="Entrar"
            loadingLabel="Carregando"
            disabled={!isSubmitEnabled}
          />
        </Field>
      </FieldGroup>
    </form>
  );
}

