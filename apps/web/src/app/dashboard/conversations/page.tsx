import { MessageSquareMore } from "lucide-react";

import { ConversationsHistoryWrapper } from "@/components/conversations/conversations-history-wrapper";
import { createPageMetadata } from "@/lib/metadata";

export const metadata = createPageMetadata("Histórico de Conversas");

export default function DashboardConversationsPage() {
  return (
    <div className="flex w-full max-w-full flex-col gap-6 p-6">
      <h2 className="flex items-center gap-2 text-2xl font-semibold">
        <MessageSquareMore className="size-6" />
        Histórico de Conversas
      </h2>

      <ConversationsHistoryWrapper />
    </div>
  );
}
