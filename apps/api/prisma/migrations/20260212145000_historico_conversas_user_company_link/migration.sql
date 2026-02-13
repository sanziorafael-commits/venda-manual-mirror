-- Align legacy historico_conversas lookup fields with HandSell user/company identifiers.
-- This migration is intentionally idempotent to support staged rollout in shared environments.

ALTER TABLE public.historico_conversas
  DROP CONSTRAINT IF EXISTS historico_conversas_user_id_fkey;

ALTER TABLE public.historico_conversas
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.historico_conversas
  ADD COLUMN IF NOT EXISTS company_id text;

CREATE INDEX IF NOT EXISTS idx_historico_user_id
  ON public.historico_conversas (user_id);

CREATE INDEX IF NOT EXISTS idx_historico_company_id
  ON public.historico_conversas (company_id);

CREATE INDEX IF NOT EXISTS idx_historico_vendedor_telefone
  ON public.historico_conversas (vendedor_telefone);

CREATE INDEX IF NOT EXISTS idx_historico_company_phone
  ON public.historico_conversas (company_id, vendedor_telefone);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'historico_conversas_user_id_handsell_fkey'
      AND conrelid = 'public.historico_conversas'::regclass
  ) THEN
    ALTER TABLE public.historico_conversas
      ADD CONSTRAINT historico_conversas_user_id_handsell_fkey
      FOREIGN KEY (user_id) REFERENCES public."User"(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'historico_conversas_company_id_handsell_fkey'
      AND conrelid = 'public.historico_conversas'::regclass
  ) THEN
    ALTER TABLE public.historico_conversas
      ADD CONSTRAINT historico_conversas_company_id_handsell_fkey
      FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
