import type { LocatedClientStatus } from '@prisma/client';

export type LocatedClientListInput = {
  seller?: string;
  status?: LocatedClientStatus;
  companyId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

export type UpdateLocatedClientStatusInput = {
  status: LocatedClientStatus;
};

export type LocatedClientWebhookInput = {
  sellerPhone: string;
  customerName: string;
  city: string;
  state: string;
  address: string;
  mapUrl: string | null;
  identifiedAt: Date | null;
  companyId: string | null;
  userId: string | null;
  source: string | null;
};
