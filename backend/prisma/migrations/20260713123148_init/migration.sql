-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'suspended', 'inactive');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'blocked', 'inactive');

-- CreateEnum
CREATE TYPE "RoleStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "SyncOperation" AS ENUM ('create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'applied', 'conflict', 'rejected');

-- CreateEnum
CREATE TYPE "InsuredStatus" AS ENUM ('active', 'suspended', 'inactive', 'cancelled', 'waiting_period', 'expired', 'pending_approval', 'blocked_nonpayment');

-- CreateEnum
CREATE TYPE "DependentRelationship" AS ENUM ('spouse', 'child', 'parent', 'sibling', 'other');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('active', 'suspended', 'cancelled');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "PolicyStatus" AS ENUM ('active', 'suspended', 'cancelled', 'renewed', 'expired');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('active', 'blocked', 'lost', 'stolen', 'replaced', 'expired');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('active', 'suspended', 'under_review');

-- CreateEnum
CREATE TYPE "AuthorizationStatus" AS ENUM ('draft', 'submitted', 'in_review', 'awaiting_documents', 'approved', 'partially_approved', 'rejected', 'cancelled', 'expired', 'used');

-- CreateEnum
CREATE TYPE "AuthorizationPriority" AS ENUM ('normal', 'urgent');

-- CreateTable
CREATE TABLE "insured_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "internal_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "photo_url" TEXT,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "sex" TEXT NOT NULL,
    "marital_status" TEXT,
    "nationality" TEXT,
    "id_document_number" TEXT NOT NULL,
    "id_issue_date" TIMESTAMP(3),
    "id_expiry_date" TIMESTAMP(3),
    "nif" TEXT,
    "phone" TEXT,
    "alt_phone" TEXT,
    "email" TEXT,
    "province" TEXT,
    "municipality" TEXT,
    "address" TEXT,
    "profession" TEXT,
    "employer" TEXT,
    "blood_type" TEXT,
    "emergency_contact" TEXT,
    "emergency_relation" TEXT,
    "join_date" TIMESTAMP(3),
    "coverage_start_date" TIMESTAMP(3),
    "coverage_end_date" TIMESTAMP(3),
    "status" "InsuredStatus" NOT NULL DEFAULT 'pending_approval',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "insured_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dependents" (
    "id" TEXT NOT NULL,
    "insured_member_id" TEXT NOT NULL,
    "relationship" "DependentRelationship" NOT NULL,
    "full_name" TEXT NOT NULL,
    "photo_url" TEXT,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "sex" TEXT NOT NULL,
    "id_document_number" TEXT,
    "phone" TEXT,
    "inclusion_date" TIMESTAMP(3),
    "exclusion_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "dependents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "trade_name" TEXT,
    "nif" TEXT NOT NULL,
    "sector" TEXT,
    "responsible_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "province" TEXT,
    "municipality" TEXT,
    "plan_id" TEXT,
    "contract_number" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "monthly_value" DECIMAL(14,2),
    "payment_mode" TEXT,
    "status" "CompanyStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_plans" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "monthly_value" DECIMAL(14,2) NOT NULL,
    "annual_limit" DECIMAL(14,2),
    "min_age" INTEGER,
    "max_age" INTEGER,
    "max_dependents" INTEGER,
    "waiting_period_days" INTEGER,
    "deductible" DECIMAL(14,2),
    "copayment_percentage" DECIMAL(5,2),
    "status" "PlanStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "health_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_coverages" (
    "id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "covered_percentage" DECIMAL(5,2) NOT NULL,
    "requires_authorization" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "plan_coverages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policies" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "policy_number" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "company_id" TEXT,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "payment_mode" TEXT NOT NULL,
    "status" "PolicyStatus" NOT NULL DEFAULT 'active',
    "signature_hash" TEXT,
    "signed_at" TIMESTAMP(3),
    "signed_by_name" TEXT,
    "signature_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "policy_members" (
    "id" TEXT NOT NULL,
    "policy_id" TEXT NOT NULL,
    "insured_member_id" TEXT NOT NULL,

    CONSTRAINT "policy_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurance_cards" (
    "id" TEXT NOT NULL,
    "insured_member_id" TEXT NOT NULL,
    "card_number" TEXT NOT NULL,
    "qr_code_token" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3) NOT NULL,
    "status" "CardStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurance_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "providers" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nif" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "license_number" TEXT,
    "responsible_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "province" TEXT,
    "municipality" TEXT,
    "status" "ProviderStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorizations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "request_number" TEXT NOT NULL,
    "insured_member_id" TEXT NOT NULL,
    "provider_id" TEXT,
    "requesting_doctor" TEXT,
    "type" TEXT NOT NULL,
    "diagnosis_code" TEXT,
    "clinical_justification" TEXT,
    "requested_procedure" TEXT,
    "budget" DECIMAL(14,2),
    "priority" "AuthorizationPriority" NOT NULL DEFAULT 'normal',
    "status" "AuthorizationStatus" NOT NULL DEFAULT 'submitted',
    "decision_notes" TEXT,
    "approved_value" DECIMAL(14,2),
    "valid_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authorization_history" (
    "id" TEXT NOT NULL,
    "authorization_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "changed_by" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorization_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "insured_member_id" TEXT NOT NULL,
    "provider_id" TEXT,
    "doctor_name" TEXT,
    "specialty" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consultation_type" TEXT,
    "reason" TEXT,
    "diagnosis_code" TEXT,
    "diagnosis_description" TEXT,
    "total_value" DECIMAL(14,2),
    "covered_value" DECIMAL(14,2),
    "copayment" DECIMAL(14,2),
    "billing_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active_ingredient" TEXT,
    "is_generic" BOOLEAN NOT NULL DEFAULT false,
    "is_covered" BOOLEAN NOT NULL DEFAULT true,
    "requires_authorization" BOOLEAN NOT NULL DEFAULT false,
    "monthly_limit_quantity" INTEGER,
    "copayment_percentage" DECIMAL(5,2),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "insured_member_id" TEXT NOT NULL,
    "medicine_id" TEXT NOT NULL,
    "prescriber_name" TEXT,
    "quantity" INTEGER NOT NULL,
    "dose" TEXT,
    "frequency" TEXT,
    "duration_days" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_dispenses" (
    "id" TEXT NOT NULL,
    "prescription_id" TEXT NOT NULL,
    "provider_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "value" DECIMAL(14,2),
    "covered_value" DECIMAL(14,2),
    "insured_paid_value" DECIMAL(14,2),
    "dispensed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_dispenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratory_requests" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "insured_member_id" TEXT NOT NULL,
    "provider_id" TEXT,
    "requesting_doctor" TEXT,
    "exam_name" TEXT NOT NULL,
    "exam_code" TEXT,
    "diagnosis_code" TEXT,
    "value" DECIMAL(14,2),
    "covered_value" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'requested',
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laboratory_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratory_results" (
    "id" TEXT NOT NULL,
    "laboratory_request_id" TEXT NOT NULL,
    "result_attachment_url" TEXT,
    "notes" TEXT,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "laboratory_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "claim_number" TEXT NOT NULL,
    "insured_member_id" TEXT NOT NULL,
    "policy_id" TEXT,
    "provider_id" TEXT,
    "occurrence_type" TEXT,
    "occurrence_date" TIMESTAMP(3),
    "location" TEXT,
    "diagnosis" TEXT,
    "requested_value" DECIMAL(14,2),
    "approved_value" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "analyst_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reimbursements" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "reimbursement_number" TEXT NOT NULL,
    "insured_member_id" TEXT NOT NULL,
    "description" TEXT,
    "requested_value" DECIMAL(14,2) NOT NULL,
    "eligible_value" DECIMAL(14,2),
    "deductible" DECIMAL(14,2),
    "copayment" DECIMAL(14,2),
    "final_value" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "bank_details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "reimbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "gross_value" DECIMAL(14,2) NOT NULL,
    "deductions" DECIMAL(14,2),
    "approved_value" DECIMAL(14,2),
    "net_value" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_items" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "insured_member_id" TEXT,
    "value" DECIMAL(14,2) NOT NULL,
    "deduction" DECIMAL(14,2),
    "deduction_reason" TEXT,
    "approved_value" DECIMAL(14,2),

    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "premiums" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "insured_member_id" TEXT,
    "company_id" TEXT,
    "policy_id" TEXT,
    "reference_month" TIMESTAMP(3) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "late_fee" DECIMAL(14,2),
    "discount" DECIMAL(14,2),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "premiums_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "premium_id" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receipt_number" TEXT,
    "registered_by" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legal_name" TEXT,
    "nif" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "logo_url" TEXT,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "last_login_at" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "insured_member_id" TEXT,
    "provider_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "status" "RoleStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "device_id" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_name" TEXT,
    "device_type" TEXT,
    "browser" TEXT,
    "operating_system" TEXT,
    "last_ip_address" TEXT,
    "last_access_at" TIMESTAMP(3),
    "is_trusted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "description" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_queue" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT,
    "device_id" TEXT,
    "operation_id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "operation" "SyncOperation" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "insured_members_internal_number_key" ON "insured_members"("internal_number");

-- CreateIndex
CREATE UNIQUE INDEX "insured_members_id_document_number_key" ON "insured_members"("id_document_number");

-- CreateIndex
CREATE UNIQUE INDEX "insured_members_nif_key" ON "insured_members"("nif");

-- CreateIndex
CREATE INDEX "insured_members_organization_id_idx" ON "insured_members"("organization_id");

-- CreateIndex
CREATE INDEX "dependents_insured_member_id_idx" ON "dependents"("insured_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "companies_nif_key" ON "companies"("nif");

-- CreateIndex
CREATE INDEX "companies_organization_id_idx" ON "companies"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "health_plans_code_key" ON "health_plans"("code");

-- CreateIndex
CREATE INDEX "health_plans_organization_id_idx" ON "health_plans"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "policies_policy_number_key" ON "policies"("policy_number");

-- CreateIndex
CREATE INDEX "policies_organization_id_idx" ON "policies"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "policy_members_policy_id_insured_member_id_key" ON "policy_members"("policy_id", "insured_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_cards_card_number_key" ON "insurance_cards"("card_number");

-- CreateIndex
CREATE UNIQUE INDEX "insurance_cards_qr_code_token_key" ON "insurance_cards"("qr_code_token");

-- CreateIndex
CREATE INDEX "insurance_cards_insured_member_id_idx" ON "insurance_cards"("insured_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "providers_nif_key" ON "providers"("nif");

-- CreateIndex
CREATE INDEX "providers_organization_id_idx" ON "providers"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "authorizations_request_number_key" ON "authorizations"("request_number");

-- CreateIndex
CREATE INDEX "authorizations_organization_id_idx" ON "authorizations"("organization_id");

-- CreateIndex
CREATE INDEX "consultations_organization_id_idx" ON "consultations"("organization_id");

-- CreateIndex
CREATE INDEX "medicines_organization_id_idx" ON "medicines"("organization_id");

-- CreateIndex
CREATE INDEX "laboratory_requests_organization_id_idx" ON "laboratory_requests"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_results_laboratory_request_id_key" ON "laboratory_results"("laboratory_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "claims_claim_number_key" ON "claims"("claim_number");

-- CreateIndex
CREATE INDEX "claims_organization_id_idx" ON "claims"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "reimbursements_reimbursement_number_key" ON "reimbursements"("reimbursement_number");

-- CreateIndex
CREATE INDEX "reimbursements_organization_id_idx" ON "reimbursements"("organization_id");

-- CreateIndex
CREATE INDEX "invoices_organization_id_idx" ON "invoices"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_provider_id_invoice_number_key" ON "invoices"("provider_id", "invoice_number");

-- CreateIndex
CREATE INDEX "premiums_organization_id_idx" ON "premiums"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_nif_key" ON "organizations"("nif");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_organization_id_idx" ON "users"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE INDEX "roles_organization_id_idx" ON "roles"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_id_key" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "devices_user_id_idx" ON "devices"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_idx" ON "audit_logs"("organization_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_module_idx" ON "audit_logs"("module");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "system_settings_organization_id_key_key" ON "system_settings"("organization_id", "key");

-- CreateIndex
CREATE UNIQUE INDEX "sync_queue_operation_id_key" ON "sync_queue"("operation_id");

-- CreateIndex
CREATE INDEX "sync_queue_organization_id_status_idx" ON "sync_queue"("organization_id", "status");

-- AddForeignKey
ALTER TABLE "insured_members" ADD CONSTRAINT "insured_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dependents" ADD CONSTRAINT "dependents_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "health_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_plans" ADD CONSTRAINT "health_plans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_coverages" ADD CONSTRAINT "plan_coverages_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "health_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "health_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_members" ADD CONSTRAINT "policy_members_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policy_members" ADD CONSTRAINT "policy_members_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurance_cards" ADD CONSTRAINT "insurance_cards_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "providers" ADD CONSTRAINT "providers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorizations" ADD CONSTRAINT "authorizations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authorization_history" ADD CONSTRAINT "authorization_history_authorization_id_fkey" FOREIGN KEY ("authorization_id") REFERENCES "authorizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_dispenses" ADD CONSTRAINT "pharmacy_dispenses_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_dispenses" ADD CONSTRAINT "pharmacy_dispenses_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_requests" ADD CONSTRAINT "laboratory_requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_requests" ADD CONSTRAINT "laboratory_requests_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_requests" ADD CONSTRAINT "laboratory_requests_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_results" ADD CONSTRAINT "laboratory_results_laboratory_request_id_fkey" FOREIGN KEY ("laboratory_request_id") REFERENCES "laboratory_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reimbursements" ADD CONSTRAINT "reimbursements_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premiums" ADD CONSTRAINT "premiums_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premiums" ADD CONSTRAINT "premiums_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premiums" ADD CONSTRAINT "premiums_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "premiums" ADD CONSTRAINT "premiums_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_premium_id_fkey" FOREIGN KEY ("premium_id") REFERENCES "premiums"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_insured_member_id_fkey" FOREIGN KEY ("insured_member_id") REFERENCES "insured_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_queue" ADD CONSTRAINT "sync_queue_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
