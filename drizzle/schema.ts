import {
  boolean,
  integer,
  index,
  uniqueIndex,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* =========================
   ENUMS
========================= */

export const roleEnum = pgEnum("role", [
  "user",
  "admin",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const transactionTypeEnum = pgEnum("transaction_type", [
  "deposit",
  "withdrawal",
  "trade",
  "transfer",
]);

export const transactionStatusEnum = pgEnum(
  "transaction_status",
  [
    "pending",
    "completed",
    "failed",
  ],
);

/* =========================
   USERS
========================= */

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  openId: varchar("openId", {
    length: 64,
  })
    .notNull()
    .unique(),

  name: text("name"),

  username: varchar("username", {
    length: 64,
  }).unique(),

  email: varchar("email", {
    length: 320,
  }),

  phone: varchar("phone", {
    length: 32,
  }),

  loginMethod: varchar("loginMethod", {
    length: 64,
  }),

  passwordHash: text("passwordHash"),

  role: roleEnum("role")
    .default("user")
    .notNull(),

  referralCode: varchar("referralCode", {
    length: 32,
  }).unique(),

  referredById: integer("referredById"),

  isBanned: boolean("isBanned")
    .default(false)
    .notNull(),

  bannedReason: text("bannedReason"),

  bannedAt: timestamp("bannedAt"),

  createdAt: timestamp("createdAt")
    .defaultNow()
    .notNull(),

  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull(),

  lastSignedIn: timestamp("lastSignedIn")
    .defaultNow()
    .notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/* =========================
   WALLET BALANCES
========================= */

export const walletBalances = pgTable(
  "wallet_balances",
  {
    id: serial("id").primaryKey(),

    userId: integer("userId")
      .notNull(),

    currency: varchar("currency", {
      length: 16,
    }).notNull(),

    amount: numeric("amount", {
      precision: 24,
      scale: 8,
    })
      .default("0")
      .notNull(),

    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull(),
  },
);

export type WalletBalance =
  typeof walletBalances.$inferSelect;

/* =========================
   DEPOSIT REQUESTS
========================= */

export const depositRequests = pgTable(
  "deposit_requests",
  {
    id: serial("id").primaryKey(),

    userId: integer("userId")
      .notNull(),

    currency: varchar("currency", {
      length: 16,
    }).notNull(),

    amount: numeric("amount", {
      precision: 24,
      scale: 8,
    }).notNull(),

    network: varchar("network", {
      length: 32,
    }),

    paymentMethod: varchar("paymentMethod", {
      length: 64,
    }),

    status: requestStatusEnum("status")
      .default("pending")
      .notNull(),

    approvedBy: integer("approvedBy"),

    approvedAt: timestamp("approvedAt"),

    createdAt: timestamp("createdAt")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull(),
  },
);

export type DepositRequest =
  typeof depositRequests.$inferSelect;

/* =========================
   WITHDRAWAL REQUESTS
========================= */

export const withdrawalRequests = pgTable(
  "withdrawal_requests",
  {
    id: serial("id").primaryKey(),

    userId: integer("userId")
      .notNull(),

    currency: varchar("currency", {
      length: 16,
    }).notNull(),

    amount: numeric("amount", {
      precision: 24,
      scale: 8,
    }).notNull(),

    address: text("address")
      .notNull(),

    network: varchar("network", {
      length: 32,
    }),

    status: requestStatusEnum("status")
      .default("pending")
      .notNull(),

    approvedBy: integer("approvedBy"),

    approvedAt: timestamp("approvedAt"),

    createdAt: timestamp("createdAt")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull(),
  },
);

export type WithdrawalRequest =
  typeof withdrawalRequests.$inferSelect;

/* =========================
   TRANSACTIONS
========================= */

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),

    transactionId: varchar("transactionId", {
      length: 40,
    })
      .notNull()
      .unique(),

    userId: integer("userId")
      .notNull(),

    type: transactionTypeEnum("type")
      .notNull(),

    amount: numeric("amount", {
      precision: 24,
      scale: 8,
    }).notNull(),

    currency: varchar("currency", {
      length: 16,
    }).notNull(),

    status: transactionStatusEnum(
      "status",
    ).notNull(),

    adminId: integer("adminId"),

    createdAt: timestamp("createdAt")
      .defaultNow()
      .notNull(),

    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull(),
  },
);

export type Transaction =
  typeof transactions.$inferSelect;


/* =========================
   TRADE CONTRACTS
========================= */

export const tradeContracts = pgTable(
  "trade_contracts",
  {
    id: serial("id").primaryKey(),
    userId: integer("userId").notNull(),
    currency: varchar("currency", { length: 16 }).notNull(),
    principal: numeric("principal", { precision: 24, scale: 8 }).notNull(),
    dailyRate: numeric("dailyRate", { precision: 8, scale: 6 }).notNull(),
    durationDays: integer("durationDays").notNull(),
    totalProfitPaid: numeric("totalProfitPaid", { precision: 24, scale: 8 }).default("0").notNull(),
    payoutCount: integer("payoutCount").default(0).notNull(),
    startedAt: timestamp("startedAt").defaultNow().notNull(),
    nextPayoutAt: timestamp("nextPayoutAt").notNull(),
    endsAt: timestamp("endsAt").notNull(),
    status: varchar("status", { length: 16 }).default("active").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("trade_contracts_user_idx").on(table.userId),
    dueIdx: index("trade_contracts_due_idx").on(table.status, table.nextPayoutAt),
    activePlanUnique: uniqueIndex("trade_contracts_user_plan_active_unique").on(table.userId, table.principal).where(sql`status = 'active'`),
  }),
);

export type TradeContract = typeof tradeContracts.$inferSelect;

export const tradePayouts = pgTable(
  "trade_payouts",
  {
    id: serial("id").primaryKey(),
    contractId: integer("contractId").notNull(),
    userId: integer("userId").notNull(),
    payoutNumber: integer("payoutNumber").notNull(),
    amount: numeric("amount", { precision: 24, scale: 8 }).notNull(),
    currency: varchar("currency", { length: 16 }).notNull(),
    paidAt: timestamp("paidAt").defaultNow().notNull(),
  },
);

export type TradePayout = typeof tradePayouts.$inferSelect;

/* =========================
   REFERRAL REWARDS
========================= */

// Every time a deposit is approved, up to 3 ancestor referrers get credited
// a percentage of that deposit (level 1 = direct inviter, level 2 = their
// inviter, level 3 = that person's inviter). One row per credited level per
// deposit, so history and per-level totals can be reconstructed exactly.
export const referralRewards = pgTable(
  "referral_rewards",
  {
    id: serial("id").primaryKey(),

    referrerId: integer("referrerId")
      .notNull(),

    sourceUserId: integer("sourceUserId")
      .notNull(),

    depositRequestId: integer("depositRequestId")
      .notNull(),

    level: integer("level")
      .notNull(),

    depositAmount: numeric("depositAmount", {
      precision: 24,
      scale: 8,
    }).notNull(),

    commission: numeric("commission", {
      precision: 24,
      scale: 8,
    }).notNull(),

    currency: varchar("currency", {
      length: 16,
    }).notNull(),

    createdAt: timestamp("createdAt")
      .defaultNow()
      .notNull(),
  },
);

export type ReferralReward =
  typeof referralRewards.$inferSelect;

/* =========================
   AUDIT LOGS
========================= */

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),

    adminId: integer("adminId")
      .notNull(),

    action: varchar("action", {
      length: 80,
    }).notNull(),

    entity: varchar("entity", {
      length: 40,
    }).notNull(),

    entityId: integer("entityId")
      .notNull(),

    metadata: text("metadata"),

    createdAt: timestamp("createdAt")
      .defaultNow()
      .notNull(),
  },
);

/* =========================
   NOTIFICATIONS
========================= */

// userId = null means a broadcast notification shown to every user.
export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),

    userId: integer("userId"),

    title: varchar("title", {
      length: 160,
    }).notNull(),

    message: text("message").notNull(),

    sentBy: integer("sentBy"),

    createdAt: timestamp("createdAt")
      .defaultNow()
      .notNull(),
  },
);

export type Notification =
  typeof notifications.$inferSelect;

/* =========================
   NOTIFICATION READS
========================= */

// One row per (user, notification) once that user has read it. Kept
// separate from `notifications` itself so a single broadcast row can be
// read/unread independently per user.
export const notificationReads = pgTable(
  "notification_reads",
  {
    id: serial("id").primaryKey(),

    notificationId: integer("notificationId")
      .notNull(),

    userId: integer("userId")
      .notNull(),

    readAt: timestamp("readAt")
      .defaultNow()
      .notNull(),
  },
);

export type NotificationRead =
  typeof notificationReads.$inferSelect;
