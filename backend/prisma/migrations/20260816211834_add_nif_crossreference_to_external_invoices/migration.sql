-- AlterTable
ALTER TABLE "external_invoices" ADD COLUMN     "company_id" TEXT,
ADD COLUMN     "insured_member_id" TEXT;

-- AddForeignKey
ALTER TABLE "external_invoices" ADD CONSTRAINT "external_invoices_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_invoices" ADD CONSTRAINT "external_invoices_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
