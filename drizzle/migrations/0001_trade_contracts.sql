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
CREATE INDEX IF NOT EXISTS "trade_contracts_user_idx" ON "trade_contracts" ("userId");
CREATE INDEX IF NOT EXISTS "trade_contracts_due_idx" ON "trade_contracts" ("status", "nextPayoutAt");
CREATE UNIQUE INDEX IF NOT EXISTS "trade_contracts_user_plan_active_unique" ON "trade_contracts" ("userId", "principal") WHERE "status" = 'active';

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
CREATE INDEX IF NOT EXISTS "trade_payouts_user_idx" ON "trade_payouts" ("userId");
