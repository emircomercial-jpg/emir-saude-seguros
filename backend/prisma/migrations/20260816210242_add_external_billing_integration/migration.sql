-- CreateTable
CREATE TABLE "integration_api_keys" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "integration_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_invoices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_tax_id" TEXT,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3),
    "total_value" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'issued',
    "items" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_api_keys_key_hash_key" ON "integration_api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "integration_api_keys_organization_id_idx" ON "integration_api_keys"("organization_id");

-- CreateIndex
CREATE INDEX "external_invoices_organization_id_idx" ON "external_invoices"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "external_invoices_organization_id_source_external_id_key" ON "external_invoices"("organization_id", "source", "external_id");

-- AddForeignKey
ALTER TABLE "integration_api_keys" ADD CONSTRAINT "integration_api_keys_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_invoices" ADD CONSTRAINT "external_invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
