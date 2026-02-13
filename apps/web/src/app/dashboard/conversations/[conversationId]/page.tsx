import Link from "next/link";
import { ArrowLeft, MessageSquareMore } from "lucide-react";

import { ConversationDetailWrapper } from "@/components/conversations/conversation-detail-wrapper";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Detalhes da Conversa");

type DashboardConversationDetailsPageProps = {
  params: Promise<{
    conversationId: string;
  }>;
};

export default async function DashboardConversationDetailsPage({
  params,
}: DashboardConversationDetailsPageProps) {
  const { conversationId } = await params;

  return (
    <div className="flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link
          href="/dashboard/conversations"
          className="inline-flex items-center gap-2 font-medium text-foreground hover:text-foreground/80"
        >
          <ArrowLeft className="size-4" />
          Voltar
        </Link>

        <span className="text-muted-foreground">
          Histórico de Conversas / Ver conversa
        </span>
      </div>

      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <MessageSquareMore className="size-6" />
        Histórico de Conversas
      </h2>

      <ConversationDetailWrapper conversationId={conversationId} />
    </div>
  );
}
