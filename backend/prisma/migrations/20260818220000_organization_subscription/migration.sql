-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "subscription_last_payment_at" TIMESTAMP(3),
ADD COLUMN     "subscription_next_due_date" TIMESTAMP(3),
ADD COLUMN     "subscription_value" DECIMAL(14,2);

