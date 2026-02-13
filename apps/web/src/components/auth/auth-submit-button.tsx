"use client";

import React from "react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type AuthSubmitButtonProps = React.ComponentProps<typeof Button> & {
  loading: boolean;
  idleLabel: string;
  loadingLabel: string;
};

export function AuthSubmitButton({
  loading,
  idleLabel,
  loadingLabel,
  disabled,
  className,
  ...props
}: AuthSubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || loading}
      className={`disabled:bg-zinc-400 disabled:text-white disabled:opacity-100 ${className ?? ""}`.trim()}
      {...props}
    >
      {loading ? (
        <span className="inline-flex items-center">
          <Spinner className="mr-2 h-4 w-4 animate-spin" />
          {loadingLabel}
        </span>
      ) : (
        idleLabel
      )}
    </Button>
  );
}
