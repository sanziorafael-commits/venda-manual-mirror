"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

import React from "react";
import Link from "next/link";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Spinner } from "../ui/spinner";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  authOkSchema,
  resetPasswordSchema,
  type ResetPasswordSchema,
} from "@/schemas/auth";
import { tryApiPostDataParsed } from "@/lib/try-api";

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token")?.trim() ?? "";

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
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
        "Nao foi possivel redefinir a senha.",
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
        <div className="flex gap-6 flex-col items-center text-center mb-16">
          <h1 className="text-3xl font-bold">Criar nova senha</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Digite sua nova senha e confirme para redefinir sua conta
          </p>
          {!tokenFromUrl && (
            <p className="text-sm text-red-500">
              Link invalido ou expirado. Solicite um novo e-mail.
            </p>
          )}
        </div>

        <Field className="gap-2 mb-6">
          <FieldLabel htmlFor="newPassword" className="font-bold">
            Nova senha
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="newPassword"
              type={showPassword ? "text" : "password"}
              placeholder="*********"
              autoComplete="new-password"
              {...register("newPassword")}
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
          {errors.newPassword && (
            <p className="text-sm text-red-500">{errors.newPassword.message}</p>
          )}
        </Field>

        <Field className="gap-2">
          <FieldLabel htmlFor="confirmPassword" className="font-bold">
            Confirmar nova senha
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="*********"
              autoComplete="new-password"
              {...register("confirmPassword")}
              required
            />
            <InputGroupAddon align="inline-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hover:bg-transparent"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
              >
                {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
              </Button>
            </InputGroupAddon>
          </InputGroup>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">
              {errors.confirmPassword.message}
            </p>
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
          Lembrou sua senha?{" "}
          <Link href="/login">Voltar ao login</Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
