"use client";

import React from "react";

import { tryApiPostDataParsed } from "@/lib/try-api";

type AuthSubmitOptions<TInput, TResult> = {
  path: string;
  parseData: (payload: unknown) => TResult | null;
  successMessage: string;
  invalidMessage: string;
  buildBody?: (input: TInput) => BodyInit | Record<string, unknown>;
  onSuccess?: (result: TResult, input: TInput) => void | Promise<void>;
};

export function useAuthSubmit<TInput, TResult>(
  options: AuthSubmitOptions<TInput, TResult>,
) {
  const [loading, setLoading] = React.useState(false);

  const submit = React.useCallback(
    async (input: TInput) => {
      setLoading(true);

      try {
        const body = options.buildBody ? options.buildBody(input) : (input as Record<string, unknown>);

        const result = await tryApiPostDataParsed(
          options.path,
          body,
          options.parseData,
          options.successMessage,
          options.invalidMessage,
        );

        if (!result) {
          return null;
        }

        if (options.onSuccess) {
          await options.onSuccess(result, input);
        }

        return result;
      } finally {
        setLoading(false);
      }
    },
    [options],
  );

  return {
    loading,
    submit,
  };
}
