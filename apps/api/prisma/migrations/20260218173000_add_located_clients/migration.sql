-- CreateEnum
CREATE TYPE "LocatedClientStatus" AS ENUM ('PENDENTE_VISITA', 'VISITADO');

-- CreateTable
CREATE TABLE "located_clients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" TEXT,
    "identified_by_user_id" TEXT,
    "source_seller_phone" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "map_url" TEXT,
    "identified_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "LocatedClientStatus" NOT NULL DEFAULT 'PENDENTE_VISITA',
    "visited_at" TIMESTAMPTZ(6),
    "visited_by_user_id" TEXT,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "located_clients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_located_clients_company_id" ON "located_clients"("company_id");

-- CreateIndex
CREATE INDEX "idx_located_clients_identified_by_user_id" ON "located_clients"("identified_by_user_id");

-- CreateIndex
CREATE INDEX "idx_located_clients_source_seller_phone" ON "located_clients"("source_seller_phone");

-- CreateIndex
CREATE INDEX "idx_located_clients_status" ON "located_clients"("status");

-- CreateIndex
CREATE INDEX "idx_located_clients_identified_at" ON "located_clients"("identified_at" DESC);

-- CreateIndex
CREATE INDEX "idx_located_clients_company_identified_at" ON "located_clients"("company_id", "identified_at" DESC);

-- CreateIndex
CREATE INDEX "idx_located_clients_visited_by_user_id" ON "located_clients"("visited_by_user_id");

-- AddForeignKey
ALTER TABLE "located_clients"
ADD CONSTRAINT "located_clients_company_id_fkey"
FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "located_clients"
ADD CONSTRAINT "located_clients_identified_by_user_id_fkey"
FOREIGN KEY ("identified_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "located_clients"
ADD CONSTRAINT "located_clients_visited_by_user_id_fkey"
FOREIGN KEY ("visited_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
