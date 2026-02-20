import type { ReactNode } from "react";

export function OverviewCardFrame({ children }: { children: ReactNode }) {
  return (
    <article className="border-border rounded-xl border bg-card p-4 shadow-xs md:min-h-38">
      {children}
    </article>
  );
}
