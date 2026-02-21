-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'DIRETOR', 'GERENTE_COMERCIAL', 'SUPERVISOR', 'VENDEDOR');

-- CreateEnum
CREATE TYPE "LocatedClientStatus" AS ENUM ('PENDENTE_VISITA', 'VISITADO');

-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "logo_url" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "manager_id" UUID,
    "supervisor_id" UUID,
    "role" "UserRole" NOT NULL,
    "full_name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "located_clients" (
    "id" UUID NOT NULL,
    "company_id" UUID,
    "identified_by_user_id" UUID,
    "source_seller_phone" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "map_url" TEXT,
    "identified_at" TIMESTAMPTZ(6) NOT NULL,
    "status" "LocatedClientStatus" NOT NULL DEFAULT 'PENDENTE_VISITA',
    "visited_at" TIMESTAMPTZ(6),
    "visited_by_user_id" UUID,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "located_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserDeletionAudit" (
    "id" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "targetCompanyId" UUID,
    "actorUserId" UUID NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDeletionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountActivationToken" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_conversas" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "timestamp_iso" TIMESTAMPTZ(6),
    "user_id" UUID,
    "company_id" UUID,
    "sender_id" TEXT,
    "data" DATE,
    "msg_type" TEXT,
    "flow_name" TEXT,
    "execution_id" TEXT,
    "message_id" TEXT,
    "mensagem" TEXT,
    "resposta" TEXT,
    "vendedor_nome" TEXT,
    "vendedor_telefone" TEXT,
    "supervisor" TEXT,
    "cliente_nome" TEXT,
    "leads_encontrados" TEXT,

    CONSTRAINT "historico_conversas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_conversas_produtos" (
    "id" UUID NOT NULL,
    "historico_id" UUID NOT NULL,
    "produto_id" UUID NOT NULL,
    "company_id" UUID,
    "cited_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,

    CONSTRAINT "historico_conversas_produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produtos" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "company_id" UUID,
    "nome" TEXT NOT NULL,
    "descricao_comercial" TEXT,
    "codigo_interno_sku" TEXT,
    "marca" TEXT,
    "categorias" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoria_outro" TEXT,
    "tipologias_clientes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tipologia_cliente_outro" TEXT,
    "sugestoes_receitas" TEXT,
    "codigo_barras_ean" TEXT,
    "codigo_barras_dun" TEXT,
    "codigo_fiscal_ncm" TEXT,
    "tipo_conservacao" TEXT,
    "tipo_conservacao_outro" TEXT,
    "validade_embalagem_fechada" TEXT,
    "validade_apos_abertura" TEXT,
    "validade_apos_preparo" TEXT,
    "instrucoes_conservacao_produto" TEXT,
    "restricoes_produto" TEXT,
    "unidade_venda" TEXT,
    "unidade_venda_outro" TEXT,
    "peso_liquido_volume" TEXT,
    "peso_bruto" TEXT,
    "qtd_unidades_por_caixa" TEXT,
    "instrucoes_conservacao_embalagem" TEXT,
    "restricoes_embalagem" TEXT,
    "possui_ingredientes" BOOLEAN,
    "ingredientes" TEXT,
    "alergenos" TEXT,
    "produto_pronto_uso" TEXT,
    "produto_pronto_uso_outro" TEXT,
    "modo_preparo" TEXT,
    "observacoes_uso" TEXT,
    "objecoes_argumentacoes" JSONB DEFAULT '[]',
    "fotos_produto" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "videos_material" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observacoes_imagens" TEXT,
    "informacoes_tecnicas_complementares" TEXT,
    "certificacoes_registros" TEXT,
    "observacoes_comerciais" TEXT,
    "diferenciais_produto" TEXT,
    "observacoes_gerais" TEXT,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_cnpj_key" ON "Company"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "User_cpf_key" ON "User"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "users_company_role_idx" ON "User"("company_id", "role");

-- CreateIndex
CREATE INDEX "users_company_manager_idx" ON "User"("company_id", "manager_id");

-- CreateIndex
CREATE INDEX "users_company_supervisor_idx" ON "User"("company_id", "supervisor_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_company_phone_key" ON "User"("company_id", "phone");

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

-- CreateIndex
CREATE INDEX "user_deletion_audit_target_user_idx" ON "UserDeletionAudit"("targetUserId");

-- CreateIndex
CREATE INDEX "user_deletion_audit_actor_user_idx" ON "UserDeletionAudit"("actorUserId");

-- CreateIndex
CREATE INDEX "user_deletion_audit_target_company_idx" ON "UserDeletionAudit"("targetCompanyId");

-- CreateIndex
CREATE INDEX "user_deletion_audit_deleted_at_idx" ON "UserDeletionAudit"("deleted_at");

-- CreateIndex
CREATE INDEX "sessions_user_revoked_idx" ON "Session"("user_id", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_user_refresh_hash_key" ON "Session"("user_id", "refreshTokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "AccountActivationToken_tokenHash_key" ON "AccountActivationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "activation_tokens_user_used_idx" ON "AccountActivationToken"("user_id", "usedAt");

-- CreateIndex
CREATE INDEX "activation_tokens_expires_idx" ON "AccountActivationToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_used_idx" ON "PasswordResetToken"("user_id", "usedAt");

-- CreateIndex
CREATE INDEX "password_reset_tokens_expires_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "idx_historico_cliente" ON "historico_conversas"("cliente_nome");

-- CreateIndex
CREATE INDEX "idx_historico_data" ON "historico_conversas"("data");

-- CreateIndex
CREATE INDEX "idx_historico_sender" ON "historico_conversas"("sender_id");

-- CreateIndex
CREATE INDEX "idx_historico_timestamp" ON "historico_conversas"("timestamp_iso");

-- CreateIndex
CREATE INDEX "idx_historico_user_id" ON "historico_conversas"("user_id");

-- CreateIndex
CREATE INDEX "idx_historico_company_id" ON "historico_conversas"("company_id");

-- CreateIndex
CREATE INDEX "idx_historico_vendedor_telefone" ON "historico_conversas"("vendedor_telefone");

-- CreateIndex
CREATE INDEX "idx_historico_company_phone" ON "historico_conversas"("company_id", "vendedor_telefone");

-- CreateIndex
CREATE INDEX "idx_historico_vendedor" ON "historico_conversas"("vendedor_nome");

-- CreateIndex
CREATE INDEX "idx_historico_produtos_historico_id" ON "historico_conversas_produtos"("historico_id");

-- CreateIndex
CREATE INDEX "idx_historico_produtos_produto_id" ON "historico_conversas_produtos"("produto_id");

-- CreateIndex
CREATE INDEX "idx_historico_produtos_company_id" ON "historico_conversas_produtos"("company_id");

-- CreateIndex
CREATE INDEX "idx_historico_produtos_company_produto" ON "historico_conversas_produtos"("company_id", "produto_id");

-- CreateIndex
CREATE UNIQUE INDEX "historico_conversas_produtos_historico_produto_key" ON "historico_conversas_produtos"("historico_id", "produto_id");

-- CreateIndex
CREATE INDEX "idx_produtos_company_id" ON "produtos"("company_id");

-- CreateIndex
CREATE INDEX "idx_produtos_deleted_at" ON "produtos"("deleted_at");

-- CreateIndex
CREATE INDEX "idx_produtos_company_nome" ON "produtos"("company_id", "nome");

-- CreateIndex
CREATE INDEX "idx_produtos_company_deleted_created" ON "produtos"("company_id", "deleted_at", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_produtos_codigo_interno" ON "produtos"("codigo_interno_sku");

-- CreateIndex
CREATE INDEX "idx_produtos_created_at" ON "produtos"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_produtos_marca" ON "produtos"("marca");

-- CreateIndex
CREATE INDEX "idx_produtos_nome" ON "produtos"("nome");

-- CreateIndex
CREATE INDEX "idx_produtos_objecoes" ON "produtos" USING GIN ("objecoes_argumentacoes");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "located_clients" ADD CONSTRAINT "located_clients_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "located_clients" ADD CONSTRAINT "located_clients_identified_by_user_id_fkey" FOREIGN KEY ("identified_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "located_clients" ADD CONSTRAINT "located_clients_visited_by_user_id_fkey" FOREIGN KEY ("visited_by_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDeletionAudit" ADD CONSTRAINT "UserDeletionAudit_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDeletionAudit" ADD CONSTRAINT "UserDeletionAudit_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDeletionAudit" ADD CONSTRAINT "UserDeletionAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountActivationToken" ADD CONSTRAINT "AccountActivationToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_conversas" ADD CONSTRAINT "historico_conversas_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_conversas" ADD CONSTRAINT "historico_conversas_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_conversas_produtos" ADD CONSTRAINT "historico_conversas_produtos_historico_id_fkey" FOREIGN KEY ("historico_id") REFERENCES "historico_conversas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_conversas_produtos" ADD CONSTRAINT "historico_conversas_produtos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_conversas_produtos" ADD CONSTRAINT "historico_conversas_produtos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
