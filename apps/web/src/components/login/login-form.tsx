"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import React from "react";
import { Spinner } from "../ui/spinner";
import { useRouter } from "next/navigation";
import { loginResponseSchema, loginSchema, type LoginSchema } from "@/schemas/auth";
import { tryApiPostDataParsed } from "@/lib/try-api";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { saveAuthSession } from "@/lib/auth-session";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
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
        "Nao foi possivel concluir o login. Tente novamente.",
      );

      if (!session) {
        return;
      }

      saveAuthSession(session);
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
        <div className="flex flex-col items-center text-center mb-16">
          <h1 className="text-3xl font-bold">Portal do Cliente</h1>
        </div>
        <Field className="gap-2 mb-6">
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

        <Field className="gap-2 mb-3">
          <FieldLabel htmlFor="password" className="font-bold">
            Senha
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="*********"
              autoComplete="current-password"
              {...register("password")}
              required
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

          {errors.password && (
            <p className="text-sm text-red-500">{errors.password.message}</p>
          )}
        </Field>
        <FieldDescription className="text-right [&>a]:no-underline">
          <Link href="/login/forgot-password" className="text-xs">
            Esqueceu sua senha?
          </Link>
        </FieldDescription>
        <Field className="gap-2 mt-6">
          <Button
            type="submit"
            disabled={!isSubmitEnabled || loading}
            className="disabled:bg-zinc-400 disabled:text-white disabled:opacity-100"
          >
            {loading ? (
              <span className="inline-flex items-center">
                <Spinner className="w-4 h-4 mr-2 animate-spin" />
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
