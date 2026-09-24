import { randomUUID } from "node:crypto";

import {
  and,
  desc,
  eq,
  gte,
  inArray,
  like,
  or,
  sql,
} from "drizzle-orm";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import {
  InsertUser,
  auditLogs,
  depositRequests,
  notificationReads,
  notifications,
  referralRewards,
  transactions,
  tradeContracts,
  tradePayouts,
  users,
  walletBalances,
  withdrawalRequests,
} from "../drizzle/schema";

import { ENV } from "./_core/env";
import { TRADE_DAILY_RATE } from "../constants/cwaax";

let _db: ReturnType<typeof drizzle> | null = null;
let _databaseUrl = "";

export function configureDatabase(databaseUrl: string) {
  if (databaseUrl && databaseUrl !== _databaseUrl) {
    _databaseUrl = databaseUrl;
    _db = null;
  }
}

export async function getDb() {
  if (_db) {
    return _db;
  }

  const databaseUrl =
    _databaseUrl ||
    process.env.DATABASE_URL ||
    ENV.databaseUrl;

  if (!databaseUrl) {
    console.warn(
      "[Database] DATABASE_URL is not configured",
    );

    return null;
  }

  try {
    /*
     * Supabase Transaction Pooler uses PgBouncer
     * in transaction mode.
     *
     * Prepared statements must therefore be disabled.
     *
     * Hyperdrive already maintains a shared connection pool at the
     * edge, so each Worker isolate only needs a handful of local
     * connections. Keeping `max` low avoids hitting Supabase's
     * connection limit when many isolates run in parallel, which is
     * what caused intermittent "Failed query" errors during login.
     */
    const client = postgres(databaseUrl, {
      prepare: false,
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
    });

    _db = drizzle(client);

    console.log(
      "[Database] PostgreSQL connection initialized",
    );

    return _db;
  } catch (error) {
    console.error(
      "[Database] Failed to initialize connection:",
      error,
    );

    _db = null;

    return null;
  }
}

/* =========================
   USERS
========================= */

export async function upsertUser(
  user: InsertUser,
): Promise<void> {
  if (!user.openId) {
    throw new Error(
      "User openId is required for upsert",
    );
  }

  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database is not available",
    );
  }

  const values: InsertUser = {
    openId: user.openId,
  };

  const updateSet: Record<
    string,
    unknown
  > = {};

  for (const field of [
    "name",
    "username",
    "email",
    "loginMethod",
    "passwordHash",
  ] as const) {
    if (user[field] !== undefined) {
      values[field] =
        user[field] ?? null;

      updateSet[field] =
        user[field] ?? null;
    }
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn =
      user.lastSignedIn;

    updateSet.lastSignedIn =
      user.lastSignedIn;
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (
    user.openId === ENV.ownerOpenId
  ) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) {
    values.lastSignedIn = new Date();
  }

  if (!Object.keys(updateSet).length) {
    updateSet.lastSignedIn =
      new Date();
  }

  updateSet.updatedAt =
    new Date();

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
}

/*
 * Transient network/connection failures between the Worker and
 * Hyperdrive (e.g. a pooled connection that Supabase closed while
 * idle) can make a single query fail even though the database itself
 * is healthy. A single retry does not always land on a healthy
 * connection when Supabase is under momentary pressure — this was
 * observed to surface as a misleading "not admin (10002)" error on
 * admin actions, because a fully-exhausted retry gets swallowed by
 * createContext() and treated as "no session". Retrying up to 3
 * times total, with a short increasing delay, gives the postgres.js
 * client more chances to open a fresh, healthy connection before we
 * give up and let the real error propagate.
 */
const DB_RETRY_ATTEMPTS = 3;
const DB_RETRY_DELAY_MS = 150;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDbRetry<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= DB_RETRY_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const isLastAttempt = attempt === DB_RETRY_ATTEMPTS;

      console.warn(
        `[Database] Query failed (attempt ${attempt}/${DB_RETRY_ATTEMPTS})${isLastAttempt ? ", giving up:" : ", retrying:"}`,
        error instanceof Error ? error.message : error,
      );

      if (!isLastAttempt) {
        await delay(DB_RETRY_DELAY_MS * attempt);
      }
    }
  }

  throw lastError;
}

export async function getUserByEmailOrUsername(
  identifier: string,
) {
  const db = await getDb();

  if (!db) {
    return undefined;
  }

  return withDbRetry(async () => (
    await db
      .select()
      .from(users)
      .where(
        or(
          eq(
            users.email,
            identifier.toLowerCase(),
          ),
          eq(
            users.username,
            identifier,
          ),
          eq(
            users.phone,
            identifier,
          ),
        ),
      )
      .limit(1)
  )[0]);
}

export async function getUserByEmail(
  email: string,
) {
  const db = await getDb();

  if (!db) {
    return undefined;
  }

  return (
    await db
      .select()
      .from(users)
      .where(
        eq(
          users.email,
          email.toLowerCase(),
        ),
      )
      .limit(1)
  )[0];
}

export async function getUserByPhone(
  phone: string,
) {
  const db = await getDb();

  if (!db) {
    return undefined;
  }

  return (
    await db
      .select()
      .from(users)
      .where(
        eq(
          users.phone,
          phone,
        ),
      )
      .limit(1)
  )[0];
}

export async function getUserByUsername(
  username: string,
) {
  const db = await getDb();

  if (!db) {
    return undefined;
  }

  return (
    await db
      .select()
      .from(users)
      .where(
        eq(users.username, username),
      )
      .limit(1)
  )[0];
}

export async function getUserByReferralCode(
  code: string,
) {
  const db = await getDb();

  if (!db) {
    return undefined;
  }

  return (
    await db
      .select()
      .from(users)
      .where(
        eq(
          users.referralCode,
          code.trim().toUpperCase(),
        ),
      )
      .limit(1)
  )[0];
}

export async function createLocalUser(
  data: {
    name: string;
    username: string;
    email: string;
    passwordHash: string;
    referralCode?: string;
    phone?: string;
  },
) {
  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database not available",
    );
  }

  const openId =
    `local_${randomUUID()}`;

  // The user's own referral code is derived from their (already unique,
  // alphanumeric) username, uppercased, prefixed like the rest of the
  // brand's codes (e.g. "CWAAX-AHMED928"). Reusing the username guarantees
  // uniqueness without a extra collision-retry loop.
  const ownReferralCode =
    `CWAAX-${data.username.toUpperCase()}`;

  let referredById: number | undefined;

  if (data.referralCode?.trim()) {
    const inviter =
      await getUserByReferralCode(
        data.referralCode,
      );
    if (inviter) {
      referredById = inviter.id;
    }
  }

  const inserted =
    await db
      .insert(users)
      .values({
        openId,
        name: data.name,
        username: data.username,
        email:
          data.email.toLowerCase(),
        phone: data.phone || undefined,
        passwordHash:
          data.passwordHash,
        loginMethod: "email",
        role: "user",
        referralCode:
          ownReferralCode,
        referredById,
      })
      .returning({
        id: users.id,
      });

  const id =
    inserted[0]?.id ?? 0;

  return (
    await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1)
  )[0];
}

export async function getUserByOpenId(
  openId: string,
) {
  const db = await getDb();

  if (!db) {
    return undefined;
  }

  return withDbRetry(async () => (
    await db
      .select()
      .from(users)
      .where(
        eq(users.openId, openId),
      )
      .limit(1)
  )[0]);
}

export async function updateUserLastSignedIn(
  userId: number,
) {
  const db = await getDb();

  if (!db) {
    return;
  }

  await db
    .update(users)
    .set({
      lastSignedIn: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function updateUserPassword(
  userId: number,
  passwordHash: string,
) {
  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database not available",
    );
  }

  await db
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/* =========================
   ADMIN USERS
========================= */

export async function listUsers(
  search?: string,
) {
  const db = await getDb();

  if (!db) {
    return [];
  }

  const term = search?.trim();
  const pattern = term ? `%${term}%` : null;

  const rows = await (pattern
    ? db
        .select()
        .from(users)
        .where(
          or(
            like(users.name, pattern),
            like(users.username, pattern),
            like(users.email, pattern),
            like(users.openId, pattern),
          ),
        )
        .orderBy(desc(users.createdAt))
    : db.select().from(users).orderBy(desc(users.createdAt)));

  if (!rows.length) {
    return [];
  }

  const ids = rows.map((u) => u.id);

  // Direct (level-1) referral count per user, in a single grouped query
  // instead of one query per row.
  const referralCounts = await db
    .select({
      referredById: users.referredById,
      count: sql<string>`count(*)`,
    })
    .from(users)
    .where(inArray(users.referredById, ids))
    .groupBy(users.referredById);

  const referralCountMap = new Map<number, number>();
  for (const row of referralCounts) {
    if (row.referredById != null) {
      referralCountMap.set(row.referredById, Number(row.count));
    }
  }

  // Total referral earnings (all 3 levels combined) per user.
  const earnings = await db
    .select({
      referrerId: referralRewards.referrerId,
      total: sql<string>`coalesce(sum(${referralRewards.commission}), 0)`,
    })
    .from(referralRewards)
    .where(inArray(referralRewards.referrerId, ids))
    .groupBy(referralRewards.referrerId);

  const earningsMap = new Map<number, number>();
  for (const row of earnings) {
    earningsMap.set(row.referrerId, Number(row.total));
  }

  // Wallet balances per user (small table, fine to fetch in bulk).
  const balances = await db
    .select()
    .from(walletBalances)
    .where(inArray(walletBalances.userId, ids));

  const balanceMap = new Map<number, { currency: string; amount: string }[]>();
  for (const b of balances) {
    const list = balanceMap.get(b.userId) ?? [];
    list.push({ currency: b.currency, amount: b.amount });
    balanceMap.set(b.userId, list);
  }

  return rows.map((u) => ({
    ...u,
    directReferrals: referralCountMap.get(u.id) ?? 0,
    totalReferralEarnings: earningsMap.get(u.id) ?? 0,
    balances: balanceMap.get(u.id) ?? [],
  }));
}

/* =========================
   ADMIN: USER DETAIL
========================= */

export async function getAdminUserDetail(userId: number) {
  const db = await getDb();

  if (!db) {
    return null;
  }

  const user = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];

  if (!user) {
    return null;
  }

  const [referral, balances, recentTransactions] = await Promise.all([
    getReferralStats(userId),
    db
      .select()
      .from(walletBalances)
      .where(eq(walletBalances.userId, userId)),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt))
      .limit(20),
  ]);

  return { user, referral, balances, recentTransactions };
}

/* =========================
   ADMIN: BAN / UNBAN
========================= */

export async function banUser(userId: number, reason?: string) {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({
      isBanned: true,
      bannedReason: reason ?? null,
      bannedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function unbanUser(userId: number) {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .update(users)
    .set({
      isBanned: false,
      bannedReason: null,
      bannedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/* =========================
   ADMIN: BALANCE ADJUSTMENT
========================= */

export async function adminAdjustBalance(params: {
  userId: number;
  currency: string;
  amount: number;
  direction: "credit" | "debit";
  adminId: number;
  note?: string;
}) {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  const currency = params.currency.toUpperCase();

  return db.transaction(async (tx) => {
    const balance = (
      await tx
        .select()
        .from(walletBalances)
        .where(
          and(
            eq(walletBalances.userId, params.userId),
            eq(walletBalances.currency, currency),
          ),
        )
        .limit(1)
    )[0];

    if (params.direction === "debit") {
      const current = Number(balance?.amount ?? 0);
      if (!balance || current < params.amount) {
        throw new Error("رصيد المستخدم غير كافٍ لإتمام هذا السحب");
      }
    }

    const signedAmount =
      params.direction === "credit" ? params.amount : -params.amount;

    if (balance) {
      await tx
        .update(walletBalances)
        .set({
          amount: sql`${walletBalances.amount} + ${signedAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(walletBalances.id, balance.id));
    } else {
      await tx.insert(walletBalances).values({
        userId: params.userId,
        currency,
        amount: params.amount.toFixed(8),
      });
    }

    await tx.insert(transactions).values({
      transactionId: `ADJ-${params.userId}-${Date.now()}`,
      userId: params.userId,
      type: params.direction === "credit" ? "deposit" : "withdrawal",
      amount: params.amount.toFixed(8),
      currency,
      status: "completed",
      adminId: params.adminId,
    });

    await tx.insert(auditLogs).values({
      adminId: params.adminId,
      action:
        params.direction === "credit"
          ? "admin_credit_balance"
          : "admin_debit_balance",
      entity: "user",
      entityId: params.userId,
      metadata: JSON.stringify({
        currency,
        amount: params.amount,
        note: params.note ?? null,
      }),
    });

    return { success: true };
  });
}

/* =========================
   TRADE CONTRACTS
========================= */

const TRADE_DAILY_RATE_DB = TRADE_DAILY_RATE.toFixed(6);
const TRADE_DURATION_DAYS = 365;

/*
 * All contracts, regardless of when each user started theirs, pay out
 * at the SAME daily wall-clock moment (00:00 UTC) — so every user sees
 * the exact same countdown and everyone's profit lands together. This
 * anchor never depends on `startedAt`; it only depends on `now`, so it
 * naturally stays in lockstep for every contract forever (each cycle
 * in processDueTradePayouts just adds 24h to the previous anchor,
 * landing on the same time of day again).
 */
function nextGlobalPayoutAnchor(from: Date): Date {
  const next = new Date(from);
  next.setUTCHours(0, 0, 0, 0);
  if (next.getTime() <= from.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

export async function listTradeContracts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  // عند فتح صفحة التجارة: صرف الأرباح المستحقة وإعادة ضبط العدّاد
  try {
    await processDueTradePayouts(new Date());
  } catch (error) {
    console.error("[Trade] processDue on list failed", error);
  }
  return db.select().from(tradeContracts)
    .where(eq(tradeContracts.userId, userId))
    .orderBy(desc(tradeContracts.createdAt));
}

export async function startTradeContract(params: {
  userId: number;
  amount: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const amount = Number(params.amount.toFixed(8));
  if (!Number.isFinite(amount) || amount < 50) {
    throw new Error("الحد الأدنى لبدء العقد هو 50 USDT");
  }

  const now = new Date();
  // Every contract's *next* payout lands on the shared global anchor —
  // this is what keeps every user's countdown identical.
  const nextPayoutAt = nextGlobalPayoutAnchor(now);
  const endsAt = new Date(now.getTime() + TRADE_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const immediateProfit = Number((amount * TRADE_DAILY_RATE).toFixed(8));

  return db.transaction(async (tx) => {
    // One active contract per plan amount per user. This is also enforced by
    // the database unique partial index to protect against concurrent taps.
    const existing = (await tx.select({ id: tradeContracts.id }).from(tradeContracts).where(and(
      eq(tradeContracts.userId, params.userId),
      eq(tradeContracts.currency, "USDT"),
      eq(tradeContracts.principal, amount.toFixed(8)),
      eq(tradeContracts.status, "active"),
    )).limit(1))[0];
    if (existing) {
      throw new Error("هذا العقد مفعل بالفعل ولا يمكنك شراء نفس العقد مرة أخرى");
    }

    const balance = (await tx.select().from(walletBalances).where(and(
      eq(walletBalances.userId, params.userId),
      eq(walletBalances.currency, "USDT"),
    )).limit(1))[0];

    const current = Number(balance?.amount ?? 0);
    if (!balance || current < amount) {
      throw new Error("رصيد USDT غير كافٍ لبدء هذا العقد");
    }

    const debited = await tx.update(walletBalances).set({
      amount: sql`${walletBalances.amount} - ${amount.toFixed(8)}`,
      updatedAt: now,
    }).where(and(
      eq(walletBalances.id, balance.id),
      sql`${walletBalances.amount} >= ${amount.toFixed(8)}`,
    )).returning({ id: walletBalances.id });

    if (!debited.length) throw new Error("تعذر حجز رصيد USDT، حاول مرة أخرى");

    const contract = (await tx.insert(tradeContracts).values({
      userId: params.userId,
      currency: "USDT",
      principal: amount.toFixed(8),
      dailyRate: TRADE_DAILY_RATE_DB,
      durationDays: TRADE_DURATION_DAYS,
      // The immediate activation profit is counted as payout #1 right
      // away — the user doesn't wait a full cycle to see their first
      // return.
      totalProfitPaid: immediateProfit.toFixed(8),
      payoutCount: 1,
      startedAt: now,
      nextPayoutAt,
      endsAt,
      status: "active",
      createdAt: now,
      updatedAt: now,
    }).returning())[0];

    if (!contract) throw new Error("تعذر إنشاء عقد التداول");

    await tx.insert(transactions).values({
      transactionId: `TRADE-START-${contract.id}-${Date.now()}`,
      userId: params.userId,
      type: "trade",
      amount: amount.toFixed(8),
      currency: "USDT",
      status: "completed",
    });

    // Credit the immediate activation profit to the wallet right now,
    // and record it the same way a scheduled payout is recorded so it
    // shows up consistently in history.
    const walletAfterDebit = (await tx.select().from(walletBalances).where(and(
      eq(walletBalances.userId, params.userId),
      eq(walletBalances.currency, "USDT"),
    )).limit(1))[0];

    if (walletAfterDebit) {
      await tx.update(walletBalances).set({
        amount: sql`${walletBalances.amount} + ${immediateProfit.toFixed(8)}`,
        updatedAt: now,
      }).where(eq(walletBalances.id, walletAfterDebit.id));
    } else {
      await tx.insert(walletBalances).values({
        userId: params.userId,
        currency: "USDT",
        amount: immediateProfit.toFixed(8),
        updatedAt: now,
      });
    }

    await tx.insert(tradePayouts).values({
      contractId: contract.id,
      userId: params.userId,
      payoutNumber: 1,
      amount: immediateProfit.toFixed(8),
      currency: "USDT",
      paidAt: now,
    });

    await tx.insert(transactions).values({
      transactionId: `TRADE-PAYOUT-${contract.id}-1`,
      userId: params.userId,
      type: "trade",
      amount: immediateProfit.toFixed(8),
      currency: "USDT",
      status: "completed",
    });

    return contract;
  });
}

/** Process due daily payouts. The conditional UPDATE acts as the atomic claim,
 * so two cron invocations cannot pay the same contract/day concurrently. */
export async function processDueTradePayouts(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const nowIso = now.toISOString();
  let paid = 0;

  // Keep existing active contracts aligned with the advertised 3.5% daily rate.
  // This changes future payouts only; it does not create retroactive credits.
  await db.update(tradeContracts)
    .set({ dailyRate: TRADE_DAILY_RATE_DB })
    .where(and(
      eq(tradeContracts.status, "active"),
      sql`${tradeContracts.dailyRate} <> ${TRADE_DAILY_RATE_DB}`,
    ));

  // عدة دورات لصرف الأيام المتأخرة (حتى 30 يوماً كحد أقصى لكل تشغيل)
  for (let round = 0; round < 30; round++) {
    const due = await db.select().from(tradeContracts).where(and(
      eq(tradeContracts.status, "active"),
      sql`${tradeContracts.nextPayoutAt} <= ${nowIso}`,
    )).limit(200);

    if (!due.length) break;

    let paidThisRound = 0;
    for (const candidate of due) {
      try {
        await db.transaction(async (tx) => {
          const payoutAmount = Number(candidate.principal) * Number(candidate.dailyRate);
          if (!Number.isFinite(payoutAmount) || payoutAmount <= 0) return;

          // تقدّم يوم واحد من موعد الاستحقاق
          let next = new Date(new Date(candidate.nextPayoutAt).getTime() + 24 * 60 * 60 * 1000);
          // إذا بقي في الماضي → انتقل لأقرب منتصف ليل UTC قادم حتى لا يبقى العداد 00:00:00
          if (next.getTime() <= now.getTime()) {
            next = nextGlobalPayoutAnchor(now);
          }

          const nextCount = candidate.payoutCount + 1;
          const endsAt = new Date(candidate.endsAt);
          const isFinal = next.getTime() >= endsAt.getTime();

          const claimed = await tx.update(tradeContracts).set({
            payoutCount: nextCount,
            totalProfitPaid: sql`${tradeContracts.totalProfitPaid} + ${payoutAmount.toFixed(8)}`,
            nextPayoutAt: next,
            status: isFinal ? "completed" : "active",
            updatedAt: now,
          }).where(and(
            eq(tradeContracts.id, candidate.id),
            eq(tradeContracts.status, "active"),
            sql`${tradeContracts.nextPayoutAt} <= ${nowIso}`,
          )).returning({ id: tradeContracts.id });

          if (!claimed.length) return;

          const wallet = (await tx.select().from(walletBalances).where(and(
            eq(walletBalances.userId, candidate.userId),
            eq(walletBalances.currency, "USDT"),
          )).limit(1))[0];

          const principalReturn = isFinal ? Number(candidate.principal) : 0;
          const walletCredit = payoutAmount + principalReturn;

          if (wallet) {
            await tx.update(walletBalances).set({
              amount: sql`${walletBalances.amount} + ${walletCredit.toFixed(8)}`,
              updatedAt: now,
            }).where(eq(walletBalances.id, wallet.id));
          } else {
            await tx.insert(walletBalances).values({
              userId: candidate.userId,
              currency: "USDT",
              amount: walletCredit.toFixed(8),
              updatedAt: now,
            });
          }

          await tx.insert(tradePayouts).values({
            contractId: candidate.id,
            userId: candidate.userId,
            payoutNumber: nextCount,
            amount: payoutAmount.toFixed(8),
            currency: "USDT",
            paidAt: now,
          });

          await tx.insert(transactions).values({
            transactionId: `TRADE-PAYOUT-${candidate.id}-${nextCount}`,
            userId: candidate.userId,
            type: "trade",
            amount: payoutAmount.toFixed(8),
            currency: "USDT",
            status: "completed",
          });

          if (isFinal) {
            await tx.insert(transactions).values({
              transactionId: `TRADE-PRINCIPAL-${candidate.id}`,
              userId: candidate.userId,
              type: "trade",
              amount: Number(candidate.principal).toFixed(8),
              currency: "USDT",
              status: "completed",
            });
          }

          paidThisRound += 1;
        });
      } catch (error) {
        console.error(`[Trade] payout failed for contract ${candidate.id}:`, error);
      }
    }

    paid += paidThisRound;
    if (paidThisRound === 0) break;
  }

  return { paid };
}

/* =========================
   NOTIFICATIONS
========================= */

export async function sendNotification(params: {
  userId: number | null;
  title: string;
  message: string;
  sentBy: number;
}) {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  const result = await db
    .insert(notifications)
    .values({
      userId: params.userId,
      title: params.title,
      message: params.message,
      sentBy: params.sentBy,
    })
    .returning({ id: notifications.id });

  await db.insert(auditLogs).values({
    adminId: params.sentBy,
    action: params.userId ? "send_notification" : "broadcast_notification",
    entity: "notification",
    entityId: result[0]?.id ?? 0,
    metadata: JSON.stringify({
      userId: params.userId,
      title: params.title,
    }),
  });

  return result[0]?.id ?? 0;
}

export async function listNotificationsForUser(userId: number) {
  const db = await getDb();

  if (!db) {
    return [];
  }

  // New users must not see broadcast notifications that were sent before they registered.
  const userRow = (
    await db
      .select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  )[0];

  const userCreatedAt = userRow?.createdAt ?? new Date(0);

  const rows = await db
    .select()
    .from(notifications)
    .where(
      or(
        eq(notifications.userId, userId),
        and(
          sql`${notifications.userId} is null`,
          gte(notifications.createdAt, userCreatedAt),
        ),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(50);

  if (!rows.length) {
    return [];
  }

  const reads = await db
    .select()
    .from(notificationReads)
    .where(
      and(
        eq(notificationReads.userId, userId),
        inArray(
          notificationReads.notificationId,
          rows.map((r) => r.id),
        ),
      ),
    );

  const readSet = new Set(reads.map((r) => r.notificationId));

  return rows.map((n) => ({
    ...n,
    read: readSet.has(n.id),
  }));
}

export async function listAllNotifications() {
  const db = await getDb();

  if (!db) {
    return [];
  }

  return db
    .select()
    .from(notifications)
    .orderBy(desc(notifications.createdAt))
    .limit(100);
}

export async function deleteNotification(notificationId: number, adminId: number) {
  const db = await getDb();

  if (!db) {
    throw new Error("Database not available");
  }

  // Remove read receipts first, then the notification itself.
  await db
    .delete(notificationReads)
    .where(eq(notificationReads.notificationId, notificationId));

  const deleted = await db
    .delete(notifications)
    .where(eq(notifications.id, notificationId))
    .returning({ id: notifications.id });

  if (!deleted.length) {
    throw new Error("Notification not found");
  }

  await db.insert(auditLogs).values({
    adminId,
    action: "delete_notification",
    entity: "notification",
    entityId: notificationId,
    metadata: JSON.stringify({ notificationId }),
  });

  return { success: true as const };
}

export async function markNotificationRead(
  notificationId: number,
  userId: number,
) {
  const db = await getDb();

  if (!db) {
    return;
  }

  const existing = (
    await db
      .select()
      .from(notificationReads)
      .where(
        and(
          eq(notificationReads.notificationId, notificationId),
          eq(notificationReads.userId, userId),
        ),
      )
      .limit(1)
  )[0];

  if (existing) {
    return;
  }

  await db.insert(notificationReads).values({
    notificationId,
    userId,
  });
}

/* =========================
   ADMIN STATISTICS
========================= */

export async function getAdminStats() {
  const db = await getDb();

  if (!db) {
    return {
      users: 0,
      pendingDeposits: 0,
      pendingWithdrawals: 0,
      bannedUsers: 0,
      totalReferralPayout: 0,
    };
  }

  const userRows =
    await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(users);

  const deposits =
    await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(depositRequests)
      .where(
        eq(
          depositRequests.status,
          "pending",
        ),
      );

  const withdrawals =
    await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(withdrawalRequests)
      .where(
        eq(
          withdrawalRequests.status,
          "pending",
        ),
      );

  const bannedRows = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.isBanned, true));

  const referralPayoutRows = await db
    .select({
      total: sql<string>`coalesce(sum(${referralRewards.commission}), 0)`,
    })
    .from(referralRewards);

  return {
    users: Number(
      userRows[0]?.count ?? 0,
    ),

    pendingDeposits: Number(
      deposits[0]?.count ?? 0,
    ),

    pendingWithdrawals: Number(
      withdrawals[0]?.count ?? 0,
    ),

    bannedUsers: Number(bannedRows[0]?.count ?? 0),

    totalReferralPayout: Number(referralPayoutRows[0]?.total ?? 0),
  };
}

/* =========================
   WALLET
========================= */

export async function getWalletBalances(
  userId: number,
) {
  const db = await getDb();

  if (!db) {
    return [];
  }

  return db
    .select()
    .from(walletBalances)
    .where(
      eq(
        walletBalances.userId,
        userId,
      ),
    )
    .orderBy(
      desc(
        walletBalances.updatedAt,
      ),
    );
}

/* =========================
   DEPOSITS
========================= */

export async function createDepositRequest(
  data: {
    userId: number;
    currency: string;
    amount: number;
    network?: string;
    paymentMethod?: string;
  },
) {
  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database not available",
    );
  }

  const result =
    await db
      .insert(depositRequests)
      .values({
        userId: data.userId,
        currency: data.currency,
        amount:
          data.amount.toFixed(8),
        network: data.network,
        paymentMethod:
          data.paymentMethod,
      })
      .returning({
        id: depositRequests.id,
      });

  return result[0]?.id ?? 0;
}

export async function listDepositRequests() {
  const db = await getDb();

  if (!db) {
    return [];
  }

  return db
    .select({
      request:
        depositRequests,

      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        username:
          users.username,
      },
    })
    .from(depositRequests)
    .leftJoin(
      users,
      eq(
        users.id,
        depositRequests.userId,
      ),
    )
    .orderBy(
      desc(
        depositRequests.createdAt,
      ),
    );
}

/* =========================
   WITHDRAWALS
========================= */

export async function createWithdrawalRequest(
  data: {
    userId: number;
    currency: string;
    amount: number;
    address: string;
    network?: string;
  },
) {
  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database not available",
    );
  }

  return db.transaction(
    async (tx) => {
      // Hold the funds immediately: atomically debit the balance only if
      // enough is available. Using a conditional UPDATE (amount >= data.amount)
      // instead of a separate SELECT-then-UPDATE prevents a race where two
      // simultaneous withdrawal requests could both pass a balance check
      // before either debit lands.
      const debited =
        await tx
          .update(
            walletBalances,
          )
          .set({
            amount: sql`
              ${walletBalances.amount}
              - ${data.amount}
            `,
            updatedAt:
              new Date(),
          })
          .where(
            and(
              eq(
                walletBalances.userId,
                data.userId,
              ),
              eq(
                walletBalances.currency,
                data.currency,
              ),
              gte(
                walletBalances.amount,
                data.amount,
              ),
            ),
          )
          .returning({
            id:
              walletBalances.id,
          });

      if (!debited.length) {
        throw new Error(
          "Insufficient balance",
        );
      }

      const result =
        await tx
          .insert(
            withdrawalRequests,
          )
          .values({
            userId: data.userId,
            currency:
              data.currency,
            amount:
              data.amount.toFixed(
                8,
              ),
            address:
              data.address,
            network:
              data.network,
          })
          .returning({
            id:
              withdrawalRequests.id,
          });

      const requestId =
        result[0]?.id ?? 0;

      // Record the withdrawal in the transactions ledger right away, as
      // "pending" — this is what makes it show up immediately in the
      // user's transaction history while it awaits admin review. The
      // transactionId embeds the request id (no timestamp suffix here) so
      // approveWithdrawal/rejectWithdrawal can find and update this exact
      // row later instead of inserting a duplicate one.
      await tx
        .insert(transactions)
        .values({
          transactionId:
            `WTH-${requestId}`,
          userId:
            data.userId,
          type:
            "withdrawal",
          amount:
            data.amount.toFixed(
              8,
            ),
          currency:
            data.currency,
          status:
            "pending",
        });

      return requestId;
    },
  );
}

export async function listWithdrawalRequests() {
  const db = await getDb();

  if (!db) {
    return [];
  }

  return db
    .select({
      request:
        withdrawalRequests,

      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        username:
          users.username,
      },
    })
    .from(withdrawalRequests)
    .leftJoin(
      users,
      eq(
        users.id,
        withdrawalRequests.userId,
      ),
    )
    .orderBy(
      desc(
        withdrawalRequests.createdAt,
      ),
    );
}

/* =========================
   TRANSACTIONS
========================= */

export async function listTransactions(
  userId?: number,
) {
  const db = await getDb();

  if (!db) {
    return [];
  }

  const query =
    db
      .select()
      .from(transactions);

  if (userId !== undefined) {
    return query
      .where(
        eq(
          transactions.userId,
          userId,
        ),
      )
      .orderBy(
        desc(
          transactions.createdAt,
        ),
      );
  }

  return query.orderBy(
    desc(
      transactions.createdAt,
    ),
  );
}

/* =========================
   APPROVE DEPOSIT
========================= */

const REFERRAL_RATES = [0.10, 0.05, 0.025];

// Walks up to 3 levels of the referral chain starting from the person who
// deposited, and credits each ancestor referrer a percentage of the
// deposit directly into their wallet balance:
//   level 1 (direct inviter)        -> 10%
//   level 2 (inviter's inviter)     -> 5%
//   level 3 (that person's inviter) -> 2.5%
// Must be called from inside the same db transaction as the deposit
// approval so the commission and the deposit either both land or neither
// does. Silently does nothing for levels that don't have an inviter (e.g.
// a user who signed up without a referral code stops the chain there).
async function creditReferralChain(
  tx: any,
  params: {
    sourceUserId: number;
    depositRequestId: number;
    depositAmount: number;
    currency: string;
  },
) {
  let childId =
    params.sourceUserId;

  for (
    let level = 1;
    level <= REFERRAL_RATES.length;
    level++
  ) {
    const child =
      (
        await tx
          .select({
            referredById:
              users.referredById,
          })
          .from(users)
          .where(
            eq(
              users.id,
              childId,
            ),
          )
          .limit(1)
      )[0];

    if (!child?.referredById) {
      break;
    }

    const referrerId =
      child.referredById as number;

    const commission =
      params.depositAmount *
      REFERRAL_RATES[level - 1];

    if (commission > 0) {
      const balance =
        (
          await tx
            .select()
            .from(walletBalances)
            .where(
              and(
                eq(
                  walletBalances.userId,
                  referrerId,
                ),
                eq(
                  walletBalances.currency,
                  params.currency,
                ),
              ),
            )
            .limit(1)
        )[0];

      if (balance) {
        await tx
          .update(
            walletBalances,
          )
          .set({
            amount: sql`
              ${walletBalances.amount}
              + ${commission.toFixed(8)}
            `,
            updatedAt:
              new Date(),
          })
          .where(
            eq(
              walletBalances.id,
              balance.id,
            ),
          );
      } else {
        await tx
          .insert(
            walletBalances,
          )
          .values({
            userId:
              referrerId,
            currency:
              params.currency,
            amount:
              commission.toFixed(
                8,
              ),
          });
      }

      await tx
        .insert(
          referralRewards,
        )
        .values({
          referrerId,
          sourceUserId:
            params.sourceUserId,
          depositRequestId:
            params.depositRequestId,
          level,
          depositAmount:
            params.depositAmount.toFixed(
              8,
            ),
          commission:
            commission.toFixed(
              8,
            ),
          currency:
            params.currency,
        });
    }

    // Climb one level up the chain for the next iteration.
    childId = referrerId;
  }
}

export async function getReferralStats(
  userId: number,
) {
  const db = await getDb();

  if (!db) {
    return {
      referralCode: null,
      levelCounts: [0, 0, 0],
      levelEarnings: [0, 0, 0],
      totalReferred: 0,
      totalEarned: 0,
      history: [],
    };
  }

  const me =
    (
      await db
        .select({
          referralCode:
            users.referralCode,
        })
        .from(users)
        .where(
          eq(users.id, userId),
        )
        .limit(1)
    )[0];

  const level1 =
    await db
      .select({ id: users.id })
      .from(users)
      .where(
        eq(
          users.referredById,
          userId,
        ),
      );

  const level1Ids =
    level1.map((u) => u.id);

  const level2 =
    level1Ids.length
      ? await db
          .select({
            id: users.id,
          })
          .from(users)
          .where(
            inArray(
              users.referredById,
              level1Ids,
            ),
          )
      : [];

  const level2Ids =
    level2.map((u) => u.id);

  const level3 =
    level2Ids.length
      ? await db
          .select({
            id: users.id,
          })
          .from(users)
          .where(
            inArray(
              users.referredById,
              level2Ids,
            ),
          )
      : [];

  const earningsByLevel =
    await db
      .select({
        level:
          referralRewards.level,
        total: sql<string>`
          coalesce(
            sum(${referralRewards.commission}),
            0
          )
        `,
      })
      .from(referralRewards)
      .where(
        eq(
          referralRewards.referrerId,
          userId,
        ),
      )
      .groupBy(
        referralRewards.level,
      );

  const levelEarnings: [
    number,
    number,
    number,
  ] = [0, 0, 0];

  for (const row of earningsByLevel) {
    if (
      row.level >= 1 &&
      row.level <= 3
    ) {
      levelEarnings[
        row.level - 1
      ] = Number(row.total);
    }
  }

  const history =
    await db
      .select({
        id: referralRewards.id,
        level:
          referralRewards.level,
        commission:
          referralRewards.commission,
        currency:
          referralRewards.currency,
        createdAt:
          referralRewards.createdAt,
        sourceUsername:
          users.username,
        sourceName:
          users.name,
      })
      .from(referralRewards)
      .leftJoin(
        users,
        eq(
          referralRewards.sourceUserId,
          users.id,
        ),
      )
      .where(
        eq(
          referralRewards.referrerId,
          userId,
        ),
      )
      .orderBy(
        desc(
          referralRewards.createdAt,
        ),
      )
      .limit(30);

  return {
    referralCode:
      me?.referralCode ?? null,
    levelCounts: [
      level1Ids.length,
      level2Ids.length,
      level3.length,
    ],
    levelEarnings,
    totalReferred:
      level1Ids.length +
      level2Ids.length +
      level3.length,
    totalEarned:
      levelEarnings[0] +
      levelEarnings[1] +
      levelEarnings[2],
    history,
  };
}

/* =========================
   REFERRALS AT A SPECIFIC LEVEL (admin drill-down)
========================= */

// Returns the actual referred accounts at one level (1, 2, or 3) under
// `userId`, walking the same referredById tree used by getReferralStats,
// plus how much commission each of those accounts has generated for
// `userId` specifically at that level.
export async function getReferralsAtLevel(userId: number, level: 1 | 2 | 3) {
  const db = await getDb();

  if (!db) {
    return [];
  }

  const level1 = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.referredById, userId));

  const level1Ids = level1.map((u) => u.id);

  let targetIds = level1Ids;

  if (level >= 2) {
    const level2 = level1Ids.length
      ? await db
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.referredById, level1Ids))
      : [];
    targetIds = level2.map((u) => u.id);
  }

  if (level === 3) {
    const level3 = targetIds.length
      ? await db
          .select({ id: users.id })
          .from(users)
          .where(inArray(users.referredById, targetIds))
      : [];
    targetIds = level3.map((u) => u.id);
  }

  if (!targetIds.length) {
    return [];
  }

  const accounts = await db
    .select()
    .from(users)
    .where(inArray(users.id, targetIds))
    .orderBy(desc(users.createdAt));

  const earnings = await db
    .select({
      sourceUserId: referralRewards.sourceUserId,
      total: sql<string>`coalesce(sum(${referralRewards.commission}), 0)`,
    })
    .from(referralRewards)
    .where(
      and(
        eq(referralRewards.referrerId, userId),
        eq(referralRewards.level, level),
        inArray(referralRewards.sourceUserId, targetIds),
      ),
    )
    .groupBy(referralRewards.sourceUserId);

  const earningsMap = new Map<number, number>();
  for (const row of earnings) {
    earningsMap.set(row.sourceUserId, Number(row.total));
  }

  return accounts.map((u) => ({
    ...u,
    earningsContributed: earningsMap.get(u.id) ?? 0,
  }));
}

export async function approveDeposit(
  requestId: number,
  adminId: number,
) {
  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database not available",
    );
  }

  return withDbRetry(() => db.transaction(
    async (tx) => {
      const request =
        (
          await tx
            .select()
            .from(
              depositRequests,
            )
            .where(
              and(
                eq(
                  depositRequests.id,
                  requestId,
                ),
                eq(
                  depositRequests.status,
                  "pending",
                ),
              ),
            )
            .limit(1)
        )[0];

      if (!request) {
        return {
          changed: false,
          reason:
            "already_processed" as const,
        };
      }

      const marked =
        await tx
          .update(
            depositRequests,
          )
          .set({
            status: "approved",
            approvedBy:
              adminId,
            approvedAt:
              new Date(),
            updatedAt:
              new Date(),
          })
          .where(
            and(
              eq(
                depositRequests.id,
                requestId,
              ),
              eq(
                depositRequests.status,
                "pending",
              ),
            ),
          )
          .returning({
            id:
              depositRequests.id,
          });

      if (!marked.length) {
        return {
          changed: false,
          reason:
            "already_processed" as const,
        };
      }

      const balance =
        (
          await tx
            .select()
            .from(walletBalances)
            .where(
              and(
                eq(
                  walletBalances.userId,
                  request.userId,
                ),
                eq(
                  walletBalances.currency,
                  request.currency,
                ),
              ),
            )
            .limit(1)
        )[0];

      if (balance) {
        await tx
          .update(
            walletBalances,
          )
          .set({
            amount: sql`
              ${walletBalances.amount}
              + ${request.amount}
            `,
            updatedAt:
              new Date(),
          })
          .where(
            eq(
              walletBalances.id,
              balance.id,
            ),
          );
      } else {
        await tx
          .insert(
            walletBalances,
          )
          .values({
            userId:
              request.userId,
            currency:
              request.currency,
            amount:
              request.amount,
          });
      }

      await tx
        .insert(transactions)
        .values({
          transactionId:
            `DEP-${request.id}-${Date.now()}`,
          userId:
            request.userId,
          type: "deposit",
          amount:
            request.amount,
          currency:
            request.currency,
          status:
            "completed",
          adminId,
        });

      await creditReferralChain(
        tx,
        {
          sourceUserId:
            request.userId,
          depositRequestId:
            request.id,
          depositAmount:
            Number(
              request.amount,
            ),
          currency:
            request.currency,
        },
      );

      await tx
        .insert(auditLogs)
        .values({
          adminId,
          action:
            "approve_deposit",
          entity:
            "deposit_request",
          entityId:
            requestId,
          metadata:
            JSON.stringify({
              currency:
                request.currency,
              amount:
                request.amount,
            }),
        });

      return {
        changed: true,
      };
    },
  ));
}

/* =========================
   REJECT DEPOSIT
========================= */

export async function rejectDeposit(
  requestId: number,
  adminId: number,
) {
  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database not available",
    );
  }

  return withDbRetry(() => db.transaction(
    async (tx) => {
      const result =
        await tx
          .update(
            depositRequests,
          )
          .set({
            status: "rejected",
            approvedBy:
              adminId,
            approvedAt:
              new Date(),
            updatedAt:
              new Date(),
          })
          .where(
            and(
              eq(
                depositRequests.id,
                requestId,
              ),
              eq(
                depositRequests.status,
                "pending",
              ),
            ),
          )
          .returning({
            id:
              depositRequests.id,
          });

      if (!result.length) {
        return {
          changed: false,
          reason:
            "already_processed" as const,
        };
      }

      await tx
        .insert(auditLogs)
        .values({
          adminId,
          action:
            "reject_deposit",
          entity:
            "deposit_request",
          entityId:
            requestId,
        });

      return {
        changed: true,
      };
    },
  ));
}

/* =========================
   APPROVE WITHDRAWAL
========================= */

export async function approveWithdrawal(
  requestId: number,
  adminId: number,
) {
  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database not available",
    );
  }

  return withDbRetry(() => db.transaction(
    async (tx) => {
      const request =
        (
          await tx
            .select()
            .from(
              withdrawalRequests,
            )
            .where(
              and(
                eq(
                  withdrawalRequests.id,
                  requestId,
                ),
                eq(
                  withdrawalRequests.status,
                  "pending",
                ),
              ),
            )
            .limit(1)
        )[0];

      if (!request) {
        return {
          changed: false,
          reason:
            "already_processed" as const,
        };
      }

      const claimed =
        await tx
          .update(
            withdrawalRequests,
          )
          .set({
            status: "approved",
            approvedBy:
              adminId,
            approvedAt:
              new Date(),
            updatedAt:
              new Date(),
          })
          .where(
            and(
              eq(
                withdrawalRequests.id,
                requestId,
              ),
              eq(
                withdrawalRequests.status,
                "pending",
              ),
            ),
          )
          .returning({
            id:
              withdrawalRequests.id,
          });

      if (!claimed.length) {
        return {
          changed: false,
          reason:
            "already_processed" as const,
        };
      }

      // Balance was already debited when the user submitted the request
      // (funds are held pending review), so approval does NOT touch
      // walletBalances again — it only finalizes the request and flips the
      // pending transaction row (created at request time) to completed.

      await tx
        .update(transactions)
        .set({
          status:
            "completed",
          adminId,
          updatedAt:
            new Date(),
        })
        .where(
          eq(
            transactions.transactionId,
            `WTH-${request.id}`,
          ),
        );

      await tx
        .insert(auditLogs)
        .values({
          adminId,
          action:
            "approve_withdrawal",
          entity:
            "withdrawal_request",
          entityId:
            requestId,
          metadata:
            JSON.stringify({
              currency:
                request.currency,
              amount:
                request.amount,
            }),
        });

      return {
        changed: true,
      };
    },
  ));
}

/* =========================
   REJECT WITHDRAWAL
========================= */

export async function rejectWithdrawal(
  requestId: number,
  adminId: number,
) {
  const db = await getDb();

  if (!db) {
    throw new Error(
      "Database not available",
    );
  }

  return withDbRetry(() => db.transaction(
    async (tx) => {
      // Select-then-claim: only a still-pending request can be claimed, so
      // two concurrent admin actions on the same request can't both apply
      // (and can't both refund the same funds twice).
      const request =
        (
          await tx
            .select()
            .from(
              withdrawalRequests,
            )
            .where(
              and(
                eq(
                  withdrawalRequests.id,
                  requestId,
                ),
                eq(
                  withdrawalRequests.status,
                  "pending",
                ),
              ),
            )
            .limit(1)
        )[0];

      if (!request) {
        return {
          changed: false,
          reason:
            "already_processed" as const,
        };
      }

      const claimed =
        await tx
          .update(
            withdrawalRequests,
          )
          .set({
            status: "rejected",
            approvedBy:
              adminId,
            approvedAt:
              new Date(),
            updatedAt:
              new Date(),
          })
          .where(
            and(
              eq(
                withdrawalRequests.id,
                requestId,
              ),
              eq(
                withdrawalRequests.status,
                "pending",
              ),
            ),
          )
          .returning({
            id:
              withdrawalRequests.id,
          });

      if (!claimed.length) {
        return {
          changed: false,
          reason:
            "already_processed" as const,
        };
      }

      // Refund the held funds back to the user's balance since the
      // withdrawal did not go through.
      await tx
        .update(
          walletBalances,
        )
        .set({
          amount: sql`
            ${walletBalances.amount}
            + ${request.amount}
          `,
          updatedAt:
            new Date(),
        })
        .where(
          and(
            eq(
              walletBalances.userId,
              request.userId,
            ),
            eq(
              walletBalances.currency,
              request.currency,
            ),
          ),
        );

      await tx
        .update(transactions)
        .set({
          status: "failed",
          adminId,
          updatedAt:
            new Date(),
        })
        .where(
          eq(
            transactions.transactionId,
            `WTH-${request.id}`,
          ),
        );

      await tx
        .insert(auditLogs)
        .values({
          adminId,
          action:
            "reject_withdrawal",
          entity:
            "withdrawal_request",
          entityId:
            requestId,
          metadata:
            JSON.stringify({
              currency:
                request.currency,
              amount:
                request.amount,
              refunded: true,
            }),
        });

      return {
        changed: true,
      };
    },
  ));
}
