import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const REFRESH_COOKIE_KEY = "handsell.refresh_token_v2";

export default async function HomePage() {
  const cookieStore = await cookies();
  const hasSession = Boolean(cookieStore.get(REFRESH_COOKIE_KEY)?.value);

  redirect(hasSession ? "/dashboard" : "/login");
}

