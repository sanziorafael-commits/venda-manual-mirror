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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [showPassword, setShowPassword] = React.useState(false);
  const [credentials, setCredentials] = React.useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = React.useState(false);

  const isSubmitEnabled =
    credentials.email.trim().length > 0 &&
    credentials.password.trim().length > 0;

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
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
            name="email"
            type="email"
            placeholder="email@email.com"
            autoComplete="email"
            value={credentials.email}
            onChange={(event) =>
              setCredentials((prev) => ({ ...prev, email: event.target.value }))
            }
            required
          />
        </Field>

        <Field className="gap-2 mb-3">
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
