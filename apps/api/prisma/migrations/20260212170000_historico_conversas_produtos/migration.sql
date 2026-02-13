-- Link table for product mentions inside conversation history entries.

CREATE TABLE IF NOT EXISTS public.historico_conversas_produtos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  historico_id uuid NOT NULL,
  produto_id uuid NOT NULL,
  company_id text,
  cited_at timestamp(6) with time zone NOT NULL DEFAULT now(),
  source text,
  CONSTRAINT historico_conversas_produtos_pkey PRIMARY KEY (id)
);

CREATE UNIQUE INDEX IF NOT EXISTS historico_conversas_produtos_historico_produto_key
  ON public.historico_conversas_produtos (historico_id, produto_id);

CREATE INDEX IF NOT EXISTS idx_historico_produtos_historico_id
  ON public.historico_conversas_produtos (historico_id);

CREATE INDEX IF NOT EXISTS idx_historico_produtos_produto_id
  ON public.historico_conversas_produtos (produto_id);

CREATE INDEX IF NOT EXISTS idx_historico_produtos_company_id
  ON public.historico_conversas_produtos (company_id);

CREATE INDEX IF NOT EXISTS idx_historico_produtos_company_produto
  ON public.historico_conversas_produtos (company_id, produto_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'historico_conversas_produtos_historico_id_fkey'
      AND conrelid = 'public.historico_conversas_produtos'::regclass
  ) THEN
    ALTER TABLE public.historico_conversas_produtos
      ADD CONSTRAINT historico_conversas_produtos_historico_id_fkey
      FOREIGN KEY (historico_id) REFERENCES public.historico_conversas(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'historico_conversas_produtos_produto_id_fkey'
      AND conrelid = 'public.historico_conversas_produtos'::regclass
  ) THEN
    ALTER TABLE public.historico_conversas_produtos
      ADD CONSTRAINT historico_conversas_produtos_produto_id_fkey
      FOREIGN KEY (produto_id) REFERENCES public.produtos(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'historico_conversas_produtos_company_id_fkey'
      AND conrelid = 'public.historico_conversas_produtos'::regclass
  ) THEN
    ALTER TABLE public.historico_conversas_produtos
      ADD CONSTRAINT historico_conversas_produtos_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
