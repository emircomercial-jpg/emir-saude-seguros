-- DropIndex
DROP INDEX "authorizations_request_number_key";

-- DropIndex
DROP INDEX "claims_claim_number_key";

-- DropIndex
DROP INDEX "companies_nif_key";

-- DropIndex
DROP INDEX "health_plans_code_key";

-- DropIndex
DROP INDEX "insured_members_id_document_number_key";

-- DropIndex
DROP INDEX "insured_members_internal_number_key";

-- DropIndex
DROP INDEX "insured_members_nif_key";

-- DropIndex
DROP INDEX "policies_policy_number_key";

-- DropIndex
DROP INDEX "providers_nif_key";

-- DropIndex
DROP INDEX "reimbursements_reimbursement_number_key";

-- DropIndex
DROP INDEX "roles_code_key";

-- CreateIndex
CREATE UNIQUE INDEX "authorizations_organization_id_request_number_key" ON "authorizations"("organization_id", "request_number");

-- CreateIndex
CREATE UNIQUE INDEX "claims_organization_id_claim_number_key" ON "claims"("organization_id", "claim_number");

-- CreateIndex
CREATE UNIQUE INDEX "companies_organization_id_nif_key" ON "companies"("organization_id", "nif");

-- CreateIndex
CREATE UNIQUE INDEX "health_plans_organization_id_code_key" ON "health_plans"("organization_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "insured_members_organization_id_internal_number_key" ON "insured_members"("organization_id", "internal_number");

-- CreateIndex
CREATE UNIQUE INDEX "insured_members_organization_id_id_document_number_key" ON "insured_members"("organization_id", "id_document_number");

-- CreateIndex
CREATE UNIQUE INDEX "insured_members_organization_id_nif_key" ON "insured_members"("organization_id", "nif");

-- CreateIndex
CREATE UNIQUE INDEX "policies_organization_id_policy_number_key" ON "policies"("organization_id", "policy_number");

-- CreateIndex
CREATE UNIQUE INDEX "providers_organization_id_nif_key" ON "providers"("organization_id", "nif");

-- CreateIndex
CREATE UNIQUE INDEX "reimbursements_organization_id_reimbursement_number_key" ON "reimbursements"("organization_id", "reimbursement_number");

-- CreateIndex
CREATE UNIQUE INDEX "roles_organization_id_code_key" ON "roles"("organization_id", "code");

