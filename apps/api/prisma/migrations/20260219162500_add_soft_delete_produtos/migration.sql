-- Add soft delete support for products.

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS deleted_at timestamp(6) with time zone;

CREATE INDEX IF NOT EXISTS idx_produtos_deleted_at
  ON public.produtos (deleted_at);

CREATE INDEX IF NOT EXISTS idx_produtos_company_deleted_created
  ON public.produtos (company_id, deleted_at, created_at DESC);
