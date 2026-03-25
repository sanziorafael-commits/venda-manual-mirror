ALTER TABLE "historico_conversas"
ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

CREATE INDEX "idx_historico_deleted_at"
ON "historico_conversas"("deleted_at");
