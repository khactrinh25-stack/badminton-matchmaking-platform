-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "CancelPolicy" AS ENUM ('FLEXIBLE_6H', 'MODERATE_12H', 'STRICT_24H');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'FULL', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING_PAYMENT', 'EXPIRED', 'CONFIRMED', 'CANCELLED_BY_GUEST', 'CANCELLED_BY_HOST', 'CHECKED_IN', 'DISPUTED', 'SETTLED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('BOOKING_PAYMENT_GATEWAY', 'BOOKING_PAYMENT_WALLET', 'BOOKING_REFUND', 'SESSION_PAYOUT', 'WITHDRAWAL_DEDUCT', 'WITHDRAWAL_REFUND');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('PENDING_REVIEW', 'RESOLVED_GUEST_WIN', 'RESOLVED_HOST_WIN', 'RESOLVED_SPLIT');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "phone_number" VARCHAR(15) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" VARCHAR(100) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "skill_level" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "available_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "violation_count" INTEGER NOT NULL DEFAULT 0,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "locked_until" TIMESTAMP(3),
    "bank_name" VARCHAR(100),
    "bank_account_number" VARCHAR(50),
    "bank_account_name" VARCHAR(100),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "court_name" VARCHAR(150) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "court_number" VARCHAR(50) NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "price_per_slot" DECIMAL(12,2) NOT NULL,
    "min_skill_level" DOUBLE PRECISION NOT NULL,
    "max_skill_level" DOUBLE PRECISION NOT NULL,
    "min_players" INTEGER NOT NULL,
    "max_players" INTEGER NOT NULL,
    "booked_slots" INTEGER NOT NULL DEFAULT 0,
    "cancel_policy" "CancelPolicy" NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "guest_id" TEXT NOT NULL,
    "slots_count" INTEGER NOT NULL DEFAULT 1,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "expires_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "checked_in_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "settled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "booking_id" TEXT,
    "withdrawal_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance_before" DECIMAL(12,2) NOT NULL,
    "balance_after" DECIMAL(12,2) NOT NULL,
    "external_ref_id" VARCHAR(100),
    "description" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "reporter_id" TEXT NOT NULL,
    "reporter_role" VARCHAR(10) NOT NULL,
    "reason" TEXT NOT NULL,
    "reporter_lat" DOUBLE PRECISION NOT NULL,
    "reporter_lng" DOUBLE PRECISION NOT NULL,
    "reporter_distance_m" DOUBLE PRECISION NOT NULL,
    "reporter_evidence_url" VARCHAR(500) NOT NULL,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondent_lat" DOUBLE PRECISION,
    "respondent_lng" DOUBLE PRECISION,
    "respondent_distance_m" DOUBLE PRECISION,
    "respondent_evidence_url" VARCHAR(500),
    "respondent_note" TEXT,
    "responded_at" TIMESTAMP(3),
    "status" "DisputeStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "admin_id" TEXT,
    "admin_note" TEXT,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "withdrawal_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "bank_name" VARCHAR(100) NOT NULL,
    "bank_account_number" VARCHAR(50) NOT NULL,
    "bank_account_name" VARCHAR(100) NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "admin_note" VARCHAR(255),
    "processed_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_number_key" ON "users"("phone_number");

-- CreateIndex
CREATE INDEX "sessions_latitude_longitude_idx" ON "sessions"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "sessions_status_start_time_idx" ON "sessions"("status", "start_time");

-- CreateIndex
CREATE INDEX "sessions_host_id_idx" ON "sessions"("host_id");

-- CreateIndex
CREATE INDEX "bookings_session_id_status_idx" ON "bookings"("session_id", "status");

-- CreateIndex
CREATE INDEX "bookings_guest_id_idx" ON "bookings"("guest_id");

-- CreateIndex
CREATE INDEX "bookings_status_expires_at_idx" ON "bookings"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "wallet_transactions_external_ref_id_key" ON "wallet_transactions"("external_ref_id");

-- CreateIndex
CREATE INDEX "wallet_transactions_user_id_created_at_idx" ON "wallet_transactions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "wallet_transactions_booking_id_idx" ON "wallet_transactions"("booking_id");

-- CreateIndex
CREATE UNIQUE INDEX "disputes_booking_id_key" ON "disputes"("booking_id");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "withdrawal_requests_user_id_status_idx" ON "withdrawal_requests"("user_id", "status");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_withdrawal_id_fkey" FOREIGN KEY ("withdrawal_id") REFERENCES "withdrawal_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "withdrawal_requests" ADD CONSTRAINT "withdrawal_requests_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
