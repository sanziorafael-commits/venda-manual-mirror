"use client";

import { ProgressProvider } from "@bprogress/next/app";

type RouteProgressProviderProps = {
  children: React.ReactNode;
};

/**
 * Global provider for page navigation progress in the App Router.
 */
export function RouteProgressProvider({ children }: RouteProgressProviderProps) {
  return (
    <ProgressProvider
      color="#1c826e"
      height="3px"
      options={{
        parent: "#top-progress-root",
        showSpinner: false,
        easing: "ease",
        speed: 200,
        trickleSpeed: 200,
        template: '<div class="bar"></div>',
      }}
    >
      {children}
    </ProgressProvider>
  );
}
