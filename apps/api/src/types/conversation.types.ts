export type ConversationListInput = {
  q?: string;
  companyId?: string;
  vendedorNome?: string;
  vendedorTelefone?: string;
  clienteNome?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type ConversationDetailInput = {
  date?: string;
  startDate?: string;
  endDate?: string;
};

export type ConversationListItem = {
  id: string;
  companyId: string | null;
  companyName: string | null;
  vendedorNome: string;
  vendedorTelefone: string | null;
  ultimoClienteNome: string | null;
  totalInteracoes: number;
  clientesUnicos: number;
  ultimaInteracaoEm: Date | null;
  primeiraInteracaoEm: Date | null;
};

export type ConversationTimelineMessage = {
  id: string;
  historicoId: string;
  sender: 'vendedor' | 'handsell';
  text: string;
  messageType: string;
  timestamp: Date;
  clienteNome: string | null;
};
