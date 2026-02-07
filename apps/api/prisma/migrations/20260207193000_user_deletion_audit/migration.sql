-- CreateTable
CREATE TABLE "UserDeletionAudit" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "targetCompanyId" TEXT,
    "actorUserId" TEXT NOT NULL,
    "actorRole" "UserRole" NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserDeletionAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_deletion_audit_target_user_idx" ON "UserDeletionAudit"("targetUserId");

-- CreateIndex
CREATE INDEX "user_deletion_audit_actor_user_idx" ON "UserDeletionAudit"("actorUserId");

-- CreateIndex
CREATE INDEX "user_deletion_audit_target_company_idx" ON "UserDeletionAudit"("targetCompanyId");

-- CreateIndex
CREATE INDEX "user_deletion_audit_deleted_at_idx" ON "UserDeletionAudit"("deletedAt");

-- AddForeignKey
ALTER TABLE "UserDeletionAudit" ADD CONSTRAINT "UserDeletionAudit_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDeletionAudit" ADD CONSTRAINT "UserDeletionAudit_targetCompanyId_fkey" FOREIGN KEY ("targetCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDeletionAudit" ADD CONSTRAINT "UserDeletionAudit_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
