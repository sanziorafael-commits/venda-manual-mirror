import { ComingSoonCard } from "@/components/dashboard/coming-soon-card";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Cadastro de Produtos");

export default function DashboardProductsPage() {
  return <ComingSoonCard title="Cadastro de Produtos" />;
}
