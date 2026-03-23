CREATE TABLE "ConversationDeletionAudit" (
    "id" UUID NOT NULL,
    "targetConversationId" UUID NOT NULL,
    "targetCompanyId" UUID,
    "targetUserId" UUID,
    "sellerName" TEXT,
    "sellerPhone" TEXT,
    "deletedRowsCount" INTEGER NOT NULL,
    "actorUserId" UUID NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "deleted_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationDeletionAudit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "conversation_deletion_audit_target_conversation_idx" ON "ConversationDeletionAudit"("targetConversationId");
CREATE INDEX "conversation_deletion_audit_target_company_idx" ON "ConversationDeletionAudit"("targetCompanyId");
CREATE INDEX "conversation_deletion_audit_target_user_idx" ON "ConversationDeletionAudit"("targetUserId");
CREATE INDEX "conversation_deletion_audit_actor_user_idx" ON "ConversationDeletionAudit"("actorUserId");
CREATE INDEX "conversation_deletion_audit_deleted_at_idx" ON "ConversationDeletionAudit"("deleted_at");
CREATE INDEX "conversation_deletion_audit_seller_phone_idx" ON "ConversationDeletionAudit"("sellerPhone");

ALTER TABLE "ConversationDeletionAudit"
ADD CONSTRAINT "ConversationDeletionAudit_targetCompanyId_fkey"
FOREIGN KEY ("targetCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConversationDeletionAudit"
ADD CONSTRAINT "ConversationDeletionAudit_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ConversationDeletionAudit"
ADD CONSTRAINT "ConversationDeletionAudit_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
