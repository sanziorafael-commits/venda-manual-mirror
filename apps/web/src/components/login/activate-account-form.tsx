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
  activateAccountSchema,
  loginResponseSchema,
  type ActivateAccountSchema,
} from "@/schemas/auth";
import { tryApiPostDataParsed } from "@/lib/try-api";

export function ActivateAccountForm({
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
        "Nao foi possivel ativar a conta.",
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
        <div className="flex gap-6 flex-col items-center text-center mb-16">
          <h1 className="text-3xl font-bold">Ative sua conta</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Digite sua senha e confirme para ativar sua conta
          </p>
          {!tokenFromUrl && (
            <p className="text-sm text-red-500">
              Link invalido ou expirado. Solicite um novo convite.
            </p>
          )}
        </div>

        <Field className="gap-2 mb-6">
          <FieldLabel htmlFor="password" className="font-bold">
            Senha
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="*********"
              autoComplete="new-password"
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

        <Field className="gap-2">
          <FieldLabel htmlFor="confirmPassword" className="font-bold">
            Confirmar senha
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
                Ativando
              </span>
            ) : (
              "Ativar"
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
