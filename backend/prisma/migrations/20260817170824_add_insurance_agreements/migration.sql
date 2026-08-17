-- CreateTable
CREATE TABLE "insurance_agreements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "agency_name" TEXT NOT NULL,
    "agency_nif" TEXT,
    "agreement_type" TEXT NOT NULL,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "scope" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "insurance_agreements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insurance_agreements_organization_id_idx" ON "insurance_agreements"("organization_id");

-- AddForeignKey
ALTER TABLE "insurance_agreements" ADD CONSTRAINT "insurance_agreements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
