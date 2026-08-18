-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "insured_member_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "related_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_logs_organization_id_idx" ON "notification_logs"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_logs_type_related_id_channel_key" ON "notification_logs"("type", "related_id", "channel");

