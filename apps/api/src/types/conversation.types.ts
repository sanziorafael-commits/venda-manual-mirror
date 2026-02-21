export type ConversationListInput = {
  q?: string;
  company_id?: string;
  vendedor_nome?: string;
  vendedor_telefone?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
};

export type ConversationDetailInput = {
  date?: string;
  start_date?: string;
  end_date?: string;
};

export type ConversationListItem = {
  id: string;
  company_id: string | null;
  company_name: string | null;
  vendedor_nome: string;
  vendedor_telefone: string | null;
  total_interacoes: number;
  ultima_interacao_em: Date | null;
  primeira_interacao_em: Date | null;
};

export type ConversationTimelineMessage = {
  id: string;
  historico_id: string;
  sender: 'vendedor' | 'handsell';
  text: string;
  message_type: string;
  timestamp: Date;
  cliente_nome: string | null;
};


