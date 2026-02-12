"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { useForm } from "react-hook-form";

import { tryApiPostDataParsed } from "@/lib/try-api";
import { cn } from "@/lib/utils";
import {
  loginResponseSchema,
  loginSchema,
  type LoginSchema,
} from "@/schemas/auth";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { Spinner } from "@/components/ui/spinner";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const email = watch("email", "");
  const password = watch("password", "");
  const isSubmitEnabled = email.trim().length > 0 && password.trim().length > 0;

  const onSubmit = async (data: LoginSchema) => {
    setLoading(true);

    try {
      const session = await tryApiPostDataParsed(
        "/auth/login",
        data,
        (payload) => {
          const parsed = loginResponseSchema.safeParse(payload);
          return parsed.success ? parsed.data : null;
        },
        "Login realizado com sucesso!",
        "Não foi possível concluir o login. Tente novamente.",
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
        {/* <div className="mb-16 flex flex-col items-center text-center">
          <h1 className="text-3xl font-bold">Portal do Cliente</h1>
        </div> */}

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
          <Button
            type="submit"
            disabled={!isSubmitEnabled || loading}
            className="disabled:bg-zinc-400 disabled:text-white disabled:opacity-100"
          >
            {loading ? (
              <span className="inline-flex items-center">
                <Spinner className="mr-2 h-4 w-4 animate-spin" />
                Carregando
              </span>
            ) : (
              "Entrar"
            )}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
