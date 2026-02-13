"use client";

import { useSearchParams } from "next/navigation";

export function useUrlToken() {
  const searchParams = useSearchParams();
  return searchParams.get("token")?.trim() ?? "";
}
