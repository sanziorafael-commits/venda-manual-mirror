-- Add company scope to legacy products and backfill current catalog to a DEV base company.

ALTER TABLE public.produtos
  ADD COLUMN IF NOT EXISTS company_id text;

INSERT INTO public."Company" ("id", "name", "cnpj", "createdAt", "updatedAt")
VALUES (
  'c000000000000000000000000',
  'Empresa Base DEV',
  '00000000000000',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("cnpj")
DO UPDATE
SET
  "name" = EXCLUDED."name",
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE public.produtos AS p
SET company_id = c."id"
FROM public."Company" AS c
WHERE c."cnpj" = '00000000000000'
  AND p.company_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_produtos_company_id
  ON public.produtos (company_id);

CREATE INDEX IF NOT EXISTS idx_produtos_company_nome
  ON public.produtos (company_id, nome);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'produtos_company_id_handsell_fkey'
      AND conrelid = 'public.produtos'::regclass
  ) THEN
    ALTER TABLE public.produtos
      ADD CONSTRAINT produtos_company_id_handsell_fkey
      FOREIGN KEY (company_id) REFERENCES public."Company"(id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
