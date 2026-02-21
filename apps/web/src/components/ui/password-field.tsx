"use client";

import * as React from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import type { UseFormRegisterReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

type PasswordFieldProps = {
  id: string;
  label: string;
  registration: UseFormRegisterReturn;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  error?: string;
  description?: string;
  className?: string;
};

export function PasswordField({
  id,
  label,
  registration,
  placeholder = "*********",
  autoComplete = "current-password",
  required,
  error,
  description,
  className,
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <Field className={className ?? "gap-2"}>
      <FieldLabel htmlFor={id} className="font-bold">
        {label}
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          id={id}
          type={showPassword ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          {...registration}
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
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {description ? <FieldDescription>{description}</FieldDescription> : null}
    </Field>
  );
}

