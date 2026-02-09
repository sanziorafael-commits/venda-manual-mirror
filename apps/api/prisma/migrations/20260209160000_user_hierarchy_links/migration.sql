-- AlterTable
ALTER TABLE "User" ADD COLUMN "managerId" TEXT;
ALTER TABLE "User" ADD COLUMN "supervisorId" TEXT;

-- CreateIndex
CREATE INDEX "users_company_manager_idx" ON "User"("companyId", "managerId");

-- CreateIndex
CREATE INDEX "users_company_supervisor_idx" ON "User"("companyId", "supervisorId");

-- AddForeignKey
ALTER TABLE "User"
ADD CONSTRAINT "User_managerId_fkey"
FOREIGN KEY ("managerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User"
ADD CONSTRAINT "User_supervisorId_fkey"
FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
