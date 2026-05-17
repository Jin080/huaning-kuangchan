-- CreateEnum
CREATE TYPE "role_code" AS ENUM ('管理员', '企业用户');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('启用', '封禁');

-- CreateEnum
CREATE TYPE "lot_status" AS ENUM ('草稿', '待发布复核', '发布驳回', '公示中', '竞拍中', '已结束', '成交公示中', '待签约', '已签约', '已完成', '违约', '已取消');

-- CreateEnum
CREATE TYPE "enterprise_certification_status" AS ENUM ('未提交', '待审核', '审核通过', '审核驳回');

-- CreateEnum
CREATE TYPE "deposit_voucher_status" AS ENUM ('未提交', '待审核', '审核通过', '审核驳回');

-- CreateEnum
CREATE TYPE "contract_status" AS ENUM ('待签约', '已签约', '已完成', '违约');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('未退款', '审核中', '已退款');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('成交通知', '失败通知');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('站内消息', '短信');

-- CreateEnum
CREATE TYPE "notification_send_status" AS ENUM ('待发送', '已发送', '发送失败');

-- CreateEnum
CREATE TYPE "attachment_category" AS ENUM ('拍品图片', '检测报告', '企业资质', '营业执照', '意向金凭证', '内容图片', '其他');

-- CreateEnum
CREATE TYPE "auction_result_status" AS ENUM ('已生成', '已公示');

-- CreateEnum
CREATE TYPE "content_category" AS ENUM ('政策法规', '交易公告', '矿能动态', '用户黑名单管理说明', '信息发布审核机制', '竞拍规则说明', '保证金缴纳与退还说明');

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('草稿', '已发布', '已下架');

-- CreateEnum
CREATE TYPE "operation_log_action" AS ENUM ('创建', '更新', '提交审核', '审核通过', '审核驳回', '关闭', '出价', '发布', '标记已签约', '标记已完成', '标记违约', '标记退款审核中', '标记已退款', '拉黑', '解除拉黑', '登录', '退出');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" "role_code" NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "description" VARCHAR(200),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "avatar_url" VARCHAR(500),
    "status" "user_status" NOT NULL DEFAULT '启用',
    "role_id" UUID NOT NULL,
    "enterprise_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enterprises" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "contact_person" VARCHAR(80) NOT NULL,
    "contact_phone" VARCHAR(40) NOT NULL,
    "main_category" VARCHAR(120) NOT NULL,
    "legal_representative" VARCHAR(80) NOT NULL,
    "legal_representative_id_no" VARCHAR(40) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "user_category" VARCHAR(80) NOT NULL,
    "user_type" VARCHAR(80) NOT NULL,
    "registered_capital" DECIMAL(18,2),
    "region" VARCHAR(120) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "unified_social_credit_code" VARCHAR(80) NOT NULL,
    "company_profile" TEXT NOT NULL,
    "business_scope" TEXT NOT NULL,
    "payment_bank_account" VARCHAR(120) NOT NULL,
    "payment_account_name" VARCHAR(120) NOT NULL,
    "payment_bank_name" VARCHAR(160) NOT NULL,
    "payment_bank_line_no" VARCHAR(80) NOT NULL,
    "payment_is_bank_of_china" BOOLEAN NOT NULL DEFAULT false,
    "receiving_bank_account" VARCHAR(120) NOT NULL,
    "receiving_account_name" VARCHAR(120) NOT NULL,
    "receiving_bank_name" VARCHAR(160) NOT NULL,
    "receiving_bank_line_no" VARCHAR(80) NOT NULL,
    "receiving_is_bank_of_china" BOOLEAN NOT NULL DEFAULT false,
    "agreement_accepted" BOOLEAN NOT NULL DEFAULT false,
    "certification_status" "enterprise_certification_status" NOT NULL DEFAULT '未提交',
    "certification_submitted_at" TIMESTAMP(3),
    "certification_reviewed_at" TIMESTAMP(3),
    "certification_reviewer_id" UUID,
    "certification_reject_reason" TEXT,
    "is_blacklisted" BOOLEAN NOT NULL DEFAULT false,
    "service_phone" VARCHAR(40),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "enterprises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "image_one_url" VARCHAR(500) NOT NULL,
    "image_two_url" VARCHAR(500) NOT NULL,
    "start_price" DECIMAL(18,2) NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "quantity_unit" VARCHAR(20) NOT NULL DEFAULT '吨',
    "supplier" VARCHAR(160) NOT NULL,
    "origin" VARCHAR(160) NOT NULL,
    "deadline_at" TIMESTAMP(3) NOT NULL,
    "delivery_method" VARCHAR(120) NOT NULL,
    "product_info" TEXT NOT NULL,
    "product_detail" TEXT NOT NULL,
    "inspection_report_url" VARCHAR(500) NOT NULL,
    "email" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(40),
    "mineral_category" VARCHAR(120),
    "grade" VARCHAR(120),
    "assessed_price" DECIMAL(18,2),
    "deposit_ratio" DECIMAL(8,4),
    "deposit_amount" DECIMAL(18,2) NOT NULL,
    "bid_increment" DECIMAL(18,2) NOT NULL,
    "announcement_start_at" TIMESTAMP(3) NOT NULL,
    "announcement_end_at" TIMESTAMP(3) NOT NULL,
    "bidding_start_at" TIMESTAMP(3) NOT NULL,
    "bidding_end_at" TIMESTAMP(3) NOT NULL,
    "customer_notice" TEXT NOT NULL,
    "extension_enabled" BOOLEAN NOT NULL DEFAULT false,
    "extension_rule" TEXT,
    "current_highest_price" DECIMAL(18,2),
    "status" "lot_status" NOT NULL DEFAULT '草稿',
    "release_reject_reason" TEXT,
    "release_submitted_at" TIMESTAMP(3),
    "release_reviewed_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" UUID NOT NULL,
    "category" "attachment_category" NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_url" VARCHAR(500) NOT NULL,
    "mime_type" VARCHAR(120),
    "file_size" INTEGER,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "lot_id" UUID,
    "enterprise_id" UUID,
    "uploaded_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deposit_vouchers" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "enterprise_id" UUID NOT NULL,
    "attachment_id" UUID NOT NULL,
    "required_amount" DECIMAL(18,2) NOT NULL,
    "paid_amount" DECIMAL(18,2),
    "status" "deposit_voucher_status" NOT NULL DEFAULT '待审核',
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),
    "reviewer_id" UUID,
    "reject_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deposit_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bid_records" (
    "id" UUID NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "lot_id" UUID NOT NULL,
    "enterprise_id" UUID NOT NULL,
    "enterprise_name" VARCHAR(160) NOT NULL,
    "masked_enterprise_name" VARCHAR(160) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "increment_count" INTEGER NOT NULL,
    "bid_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_current_highest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "bid_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_results" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "winning_enterprise_id" UUID NOT NULL,
    "final_price" DECIMAL(18,2) NOT NULL,
    "status" "auction_result_status" NOT NULL DEFAULT '已生成',
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "auction_result_id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "enterprise_id" UUID NOT NULL,
    "status" "contract_status" NOT NULL DEFAULT '待签约',
    "signed_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "defaulted_at" TIMESTAMP(3),
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" UUID NOT NULL,
    "lot_id" UUID NOT NULL,
    "enterprise_id" UUID NOT NULL,
    "deposit_voucher_id" UUID,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "refund_status" NOT NULL DEFAULT '未退款',
    "reviewed_at" TIMESTAMP(3),
    "refunded_at" TIMESTAMP(3),
    "remark" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklist" (
    "id" UUID NOT NULL,
    "enterprise_id" UUID NOT NULL,
    "lot_id" UUID,
    "reason" TEXT NOT NULL,
    "operator_id" UUID,
    "blacklisted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMP(3),
    "release_reason" TEXT,
    "release_operator_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contents" (
    "id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "category" "content_category" NOT NULL,
    "summary" VARCHAR(500),
    "body" TEXT NOT NULL,
    "status" "content_status" NOT NULL DEFAULT '草稿',
    "published_at" TIMESTAMP(3),
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "receiver_enterprise_id" UUID NOT NULL,
    "lot_id" UUID,
    "lot_title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "send_status" "notification_send_status" NOT NULL DEFAULT '待发送',
    "sent_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operation_logs" (
    "id" UUID NOT NULL,
    "operator_id" UUID,
    "action" "operation_log_action" NOT NULL,
    "target_type" VARCHAR(80) NOT NULL,
    "target_id" VARCHAR(80),
    "summary" VARCHAR(500) NOT NULL,
    "ip_address" VARCHAR(80),
    "user_agent" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "operation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "users_enterprise_id_idx" ON "users"("enterprise_id");

-- CreateIndex
CREATE UNIQUE INDEX "enterprises_unified_social_credit_code_key" ON "enterprises"("unified_social_credit_code");

-- CreateIndex
CREATE INDEX "enterprises_certification_status_idx" ON "enterprises"("certification_status");

-- CreateIndex
CREATE INDEX "lots_status_idx" ON "lots"("status");

-- CreateIndex
CREATE INDEX "lots_announcement_start_at_announcement_end_at_idx" ON "lots"("announcement_start_at", "announcement_end_at");

-- CreateIndex
CREATE INDEX "lots_bidding_start_at_bidding_end_at_idx" ON "lots"("bidding_start_at", "bidding_end_at");

-- CreateIndex
CREATE INDEX "attachments_lot_id_idx" ON "attachments"("lot_id");

-- CreateIndex
CREATE INDEX "attachments_enterprise_id_idx" ON "attachments"("enterprise_id");

-- CreateIndex
CREATE INDEX "deposit_vouchers_status_idx" ON "deposit_vouchers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "deposit_vouchers_lot_id_enterprise_id_key" ON "deposit_vouchers"("lot_id", "enterprise_id");

-- CreateIndex
CREATE INDEX "bid_records_lot_id_bid_at_idx" ON "bid_records"("lot_id", "bid_at");

-- CreateIndex
CREATE INDEX "bid_records_enterprise_id_idx" ON "bid_records"("enterprise_id");

-- CreateIndex
CREATE UNIQUE INDEX "bid_records_lot_id_sequence_no_key" ON "bid_records"("lot_id", "sequence_no");

-- CreateIndex
CREATE UNIQUE INDEX "auction_results_lot_id_key" ON "auction_results"("lot_id");

-- CreateIndex
CREATE INDEX "auction_results_status_idx" ON "auction_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_auction_result_id_key" ON "contracts"("auction_result_id");

-- CreateIndex
CREATE INDEX "contracts_status_completed_at_idx" ON "contracts"("status", "completed_at");

-- CreateIndex
CREATE INDEX "contracts_lot_id_idx" ON "contracts"("lot_id");

-- CreateIndex
CREATE INDEX "contracts_enterprise_id_idx" ON "contracts"("enterprise_id");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_lot_id_enterprise_id_key" ON "refunds"("lot_id", "enterprise_id");

-- CreateIndex
CREATE INDEX "blacklist_enterprise_id_released_at_idx" ON "blacklist"("enterprise_id", "released_at");

-- CreateIndex
CREATE UNIQUE INDEX "contents_title_key" ON "contents"("title");

-- CreateIndex
CREATE INDEX "contents_category_status_idx" ON "contents"("category", "status");

-- CreateIndex
CREATE INDEX "notifications_receiver_enterprise_id_read_at_idx" ON "notifications"("receiver_enterprise_id", "read_at");

-- CreateIndex
CREATE INDEX "notifications_send_status_sent_at_idx" ON "notifications"("send_status", "sent_at");

-- CreateIndex
CREATE INDEX "operation_logs_operator_id_created_at_idx" ON "operation_logs"("operator_id", "created_at");

-- CreateIndex
CREATE INDEX "operation_logs_target_type_target_id_idx" ON "operation_logs"("target_type", "target_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enterprises" ADD CONSTRAINT "enterprises_certification_reviewer_id_fkey" FOREIGN KEY ("certification_reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_vouchers" ADD CONSTRAINT "deposit_vouchers_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_vouchers" ADD CONSTRAINT "deposit_vouchers_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_vouchers" ADD CONSTRAINT "deposit_vouchers_attachment_id_fkey" FOREIGN KEY ("attachment_id") REFERENCES "attachments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deposit_vouchers" ADD CONSTRAINT "deposit_vouchers_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_records" ADD CONSTRAINT "bid_records_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bid_records" ADD CONSTRAINT "bid_records_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_results" ADD CONSTRAINT "auction_results_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_results" ADD CONSTRAINT "auction_results_winning_enterprise_id_fkey" FOREIGN KEY ("winning_enterprise_id") REFERENCES "enterprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_auction_result_id_fkey" FOREIGN KEY ("auction_result_id") REFERENCES "auction_results"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_deposit_voucher_id_fkey" FOREIGN KEY ("deposit_voucher_id") REFERENCES "deposit_vouchers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_enterprise_id_fkey" FOREIGN KEY ("enterprise_id") REFERENCES "enterprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blacklist" ADD CONSTRAINT "blacklist_release_operator_id_fkey" FOREIGN KEY ("release_operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contents" ADD CONSTRAINT "contents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_receiver_enterprise_id_fkey" FOREIGN KEY ("receiver_enterprise_id") REFERENCES "enterprises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "lots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operation_logs" ADD CONSTRAINT "operation_logs_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
