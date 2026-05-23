-- AlterTable
ALTER TABLE "attachments" ADD COLUMN "contract_id" UUID;

-- CreateIndex
CREATE INDEX "attachments_contract_id_idx" ON "attachments"("contract_id");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
