import { ApiError } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-client";
import {
  meApiResponseSchema,
  type AuthUser,
  type MeUser,
} from "@/schemas/auth";

export type FetchAuthenticatedUserResult =
  | { kind: "success"; user: AuthUser }
  | { kind: "invalid_session" }
  | { kind: "temporary_error" };

export async function fetchAuthenticatedUser(): Promise<FetchAuthenticatedUserResult> {
  const result = await fetchMeUser();

  if (result.kind === "success") {
    return {
      kind: "success",
      user: toAuthUser(result.user),
    };
  }

  return result;
}

export async function fetchMeUser() {
  try {
    const payload = await apiFetch<unknown>("/me");
    const parsed = meApiResponseSchema.safeParse(payload);

    if (!parsed.success) {
      return { kind: "temporary_error" } as const;
    }

    return {
      kind: "success",
      user: parsed.data.data,
    } as const;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      return { kind: "invalid_session" } as const;
    }

    return { kind: "temporary_error" } as const;
  }
}

export function toAuthUser(user: MeUser): AuthUser {
  return {
    id: user.id,
    company_id: user.company_id,
    role: user.role,
    full_name: user.full_name,
    email: user.email,
  };
}

