CREATE TYPE "role" AS ENUM ('user', 'admin');
CREATE TYPE "request_status" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "transaction_type" AS ENUM ('deposit', 'withdrawal', 'trade', 'transfer');
CREATE TYPE "transaction_status" AS ENUM ('pending', 'completed', 'failed');

CREATE TABLE IF NOT EXISTS "users" (
  "id" serial PRIMARY KEY NOT NULL,
  "openId" varchar(64) NOT NULL UNIQUE,
  "name" text,
  "username" varchar(64) UNIQUE,
  "email" varchar(320),
  "phone" varchar(32),
  "loginMethod" varchar(64),
  "passwordHash" text,
  "role" "role" DEFAULT 'user' NOT NULL,
  "referralCode" varchar(32) UNIQUE,
  "referredById" integer,
  "isBanned" boolean DEFAULT false NOT NULL,
  "bannedReason" text,
  "bannedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "lastSignedIn" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "wallet_balances" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "currency" varchar(16) NOT NULL,
  "amount" numeric(24,8) DEFAULT '0' NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "deposit_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "currency" varchar(16) NOT NULL,
  "amount" numeric(24,8) NOT NULL,
  "network" varchar(32),
  "paymentMethod" varchar(64),
  "status" "request_status" DEFAULT 'pending' NOT NULL,
  "approvedBy" integer,
  "approvedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "currency" varchar(16) NOT NULL,
  "amount" numeric(24,8) NOT NULL,
  "address" text NOT NULL,
  "network" varchar(32),
  "status" "request_status" DEFAULT 'pending' NOT NULL,
  "approvedBy" integer,
  "approvedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "transactions" (
  "id" serial PRIMARY KEY NOT NULL,
  "transactionId" varchar(40) NOT NULL UNIQUE,
  "userId" integer NOT NULL,
  "type" "transaction_type" NOT NULL,
  "amount" numeric(24,8) NOT NULL,
  "currency" varchar(16) NOT NULL,
  "status" "transaction_status" NOT NULL,
  "adminId" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "trade_contracts" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer NOT NULL,
  "currency" varchar(16) NOT NULL,
  "principal" numeric(24,8) NOT NULL,
  "dailyRate" numeric(8,6) NOT NULL,
  "durationDays" integer NOT NULL,
  "totalProfitPaid" numeric(24,8) DEFAULT '0' NOT NULL,
  "payoutCount" integer DEFAULT 0 NOT NULL,
  "startedAt" timestamp DEFAULT now() NOT NULL,
  "nextPayoutAt" timestamp NOT NULL,
  "endsAt" timestamp NOT NULL,
  "status" varchar(16) DEFAULT 'active' NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "trade_payouts" (
  "id" serial PRIMARY KEY NOT NULL,
  "contractId" integer NOT NULL,
  "userId" integer NOT NULL,
  "payoutNumber" integer NOT NULL,
  "amount" numeric(24,8) NOT NULL,
  "currency" varchar(16) NOT NULL,
  "paidAt" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "trade_payouts_contract_number_unique" UNIQUE("contractId", "payoutNumber")
);

CREATE TABLE IF NOT EXISTS "referral_rewards" (
  "id" serial PRIMARY KEY NOT NULL,
  "referrerId" integer NOT NULL,
  "sourceUserId" integer NOT NULL,
  "depositRequestId" integer NOT NULL,
  "level" integer NOT NULL,
  "depositAmount" numeric(24,8) NOT NULL,
  "commission" numeric(24,8) NOT NULL,
  "currency" varchar(16) NOT NULL,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "adminId" integer NOT NULL,
  "action" varchar(80) NOT NULL,
  "entity" varchar(40) NOT NULL,
  "entityId" integer NOT NULL,
  "metadata" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id" serial PRIMARY KEY NOT NULL,
  "userId" integer,
  "title" varchar(160) NOT NULL,
  "message" text NOT NULL,
  "sentBy" integer,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notification_reads" (
  "id" serial PRIMARY KEY NOT NULL,
  "notificationId" integer NOT NULL,
  "userId" integer NOT NULL,
  "readAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "trade_contracts_user_idx" ON "trade_contracts" ("userId");
CREATE INDEX IF NOT EXISTS "trade_contracts_due_idx" ON "trade_contracts" ("status", "nextPayoutAt");
CREATE UNIQUE INDEX IF NOT EXISTS "trade_contracts_user_plan_active_unique" ON "trade_contracts" ("userId", "principal") WHERE "status" = 'active';
