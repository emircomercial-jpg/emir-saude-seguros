-- AlterTable
ALTER TABLE "insured_members" ADD COLUMN     "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
