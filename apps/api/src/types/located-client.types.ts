import type { LocatedClientStatus } from '@prisma/client';

export type LocatedClientListInput = {
  seller?: string;
  status?: LocatedClientStatus;
  company_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
};

export type UpdateLocatedClientStatusInput = {
  status: LocatedClientStatus;
};

export type LocatedClientWebhookInput = {
  seller_phone: string;
  customer_name: string;
  city: string;
  state: string;
  address: string;
  map_url: string | null;
  identified_at: Date | null;
  company_id: string | null;
  user_id: string | null;
  source: string | null;
};


