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

export function ActivateAccountForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [credentials, setCredentials] = React.useState({
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const isSubmitEnabled =
    credentials.password.trim().length > 0 &&
    credentials.confirmPassword.trim().length > 0;

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup className="gap-0">
        <div className="flex gap-6 flex-col items-center text-center mb-16">
          <h1 className="text-3xl font-bold">Ative sua conta</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Digite sua senha e confirme para ativar sua conta
          </p>
        </div>

        <Field className="gap-2 mb-6">
          <FieldLabel htmlFor="password" className="font-bold">
            Senha
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="*********"
              autoComplete="current-password"
              value={credentials.password}
              onChange={(event) =>
                setCredentials((prev) => ({
                  ...prev,
                  password: event.target.value,
                }))
              }
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
        </Field>
        <Field className="gap-2">
          <FieldLabel htmlFor="confirmPassword" className="font-bold">
            Confirme a senha
          </FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="*********"
              autoComplete="current-password"
              value={credentials.confirmPassword}
              onChange={(event) =>
                setCredentials((prev) => ({
                  ...prev,
                  confirmPassword: event.target.value,
                }))
              }
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
          <Link href="/login" className="">
            Voltar ao login
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
