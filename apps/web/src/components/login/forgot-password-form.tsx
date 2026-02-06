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
import { Spinner } from "../ui/spinner";

export function ForgotPassword({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [credentials, setCredentials] = React.useState({
    email: "",
  });
  const [loading, setLoading] = React.useState(false);

  const isSubmitEnabled = credentials.email.trim().length > 0;

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
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
          <Link href="/login" className="">
            Voltar ao login
          </Link>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
