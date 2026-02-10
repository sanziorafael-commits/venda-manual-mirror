import type { NextRequest } from "next/server";

import { proxy as baseProxy } from "./src/proxy";

export function proxy(request: NextRequest) {
  return baseProxy(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/login/:path*"],
};
