import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { hashPassword, verifyPassword, LIGHT_COST } from "./auth-local";
import { sdk } from "./_core/sdk";
import { ONE_YEAR_MS } from "../shared/const.js";
import { ENV } from "./_core/env";

const requestInput = z.object({ currency: z.string().min(2).max(16), amount: z.number().positive().finite(), network: z.string().max(32).optional() });

/** User-facing auth errors must use TRPCError so the client sees the real message
 *  (plain `Error` becomes INTERNAL_SERVER_ERROR and gets replaced by a generic message). */
function badRequest(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => {
      const user = opts.ctx.user;
      if (!user) return null;

      return {
        id: user.id,
        openId: user.openId,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        loginMethod: user.loginMethod,
        lastSignedIn: user.lastSignedIn,
      };
    }),
    register: publicProcedure.input(z.object({ name: z.string().trim().min(2).max(120).optional(), username: z.string().trim().min(3).max(64).regex(/^[a-zA-Z0-9_]+$/).optional(), email: z.string().trim().email().max(320), password: z.string().min(8).max(128), referralCode: z.string().trim().max(32).optional(), phone: z.string().trim().max(32).optional() })).mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      if (await db.getUserByEmail(email)) badRequest("البريد الإلكتروني مستخدم بالفعل");
      if (input.phone && (await db.getUserByPhone(input.phone))) badRequest("رقم الهاتف مستخدم بالفعل");

      // توليد اسم مستخدم تلقائياً من البريد إن لم يُرسل
      let baseUsername =
        (input.username && input.username.trim()) ||
        email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 50) ||
        "user";
      if (baseUsername.length < 3) baseUsername = `user${baseUsername}`;

      let username = baseUsername;
      if (await db.getUserByUsername(username)) {
        // إضافة لاحقة رقمية لتجنب التعارض
        for (let i = 0; i < 20; i++) {
          const candidate = `${baseUsername}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 64);
          if (!(await db.getUserByUsername(candidate))) {
            username = candidate;
            break;
          }
        }
      }

      const displayName = (input.name && input.name.trim()) || username;

      let user;
      try {
        user = await db.createLocalUser({
          name: displayName,
          username,
          email,
          passwordHash: hashPassword(input.password),
          referralCode: input.referralCode,
          phone: input.phone,
        });
      } catch (err: any) {
        const msg = String(err?.message || err || "");
        // Postgres unique_violation
        if (msg.includes("unique") || msg.includes("duplicate") || err?.code === "23505") {
          if (msg.toLowerCase().includes("email")) badRequest("البريد الإلكتروني مستخدم بالفعل");
          if (msg.toLowerCase().includes("username")) badRequest("تعذر إنشاء الحساب، جرّب مرة أخرى");
          if (msg.toLowerCase().includes("phone")) badRequest("رقم الهاتف مستخدم بالفعل");
          if (msg.toLowerCase().includes("referral")) badRequest("رمز الإحالة مستخدم بالفعل");
          badRequest("البيانات مستخدمة بالفعل، تحقق من البريد أو الهاتف");
        }
        throw err;
      }

      if (!user) badRequest("تعذر إنشاء الحساب");

      const token = await sdk.signSession(
        { openId: user.openId, appId: ENV.appId, name: user.name || user.username || "CwaAX" },
        { expiresInMs: ONE_YEAR_MS },
      );
      return {
        token,
        user: {
          id: user.id,
          openId: user.openId,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          lastSignedIn: user.lastSignedIn,
        },
      };
    }),
    login: publicProcedure.input(z.object({ identifier: z.string().trim().min(3).max(320), password: z.string().min(1).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmailOrUsername(input.identifier.includes("@") ? input.identifier.toLowerCase() : input.identifier);
      if (!user || !user.passwordHash || !verifyPassword(input.password, user.passwordHash)) {
        badRequest("بيانات تسجيل الدخول غير صحيحة");
      }
      if (user.isBanned) {
        badRequest(user.bannedReason ? `تم حظر هذا الحساب: ${user.bannedReason}` : "تم حظر هذا الحساب. تواصل مع الدعم.");
      }
      await db.updateUserLastSignedIn(user.id);
      const token = await sdk.signSession(
        { openId: user.openId, appId: ENV.appId, name: user.name || user.username || "CwaAX" },
        { expiresInMs: ONE_YEAR_MS },
      );
      return {
        token,
        user: {
          id: user.id,
          openId: user.openId,
          name: user.name,
          username: user.username,
          email: user.email,
          role: user.role,
          lastSignedIn: new Date(),
        },
      };
    }),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
    changePassword: protectedProcedure.input(z.object({ currentPassword: z.string().min(1).max(128), newPassword: z.string().min(8).max(128) })).mutation(async ({ ctx, input }) => {
      const user = await db.getUserByOpenId(ctx.user.openId);
      if (!user || !user.passwordHash || !verifyPassword(input.currentPassword, user.passwordHash)) {
        badRequest("كلمة المرور الحالية غير صحيحة");
      }
      await db.updateUserPassword(user.id, hashPassword(input.newPassword));
      return { success: true } as const;
    }),
  }),
  trade: router({
    contracts: protectedProcedure.query(({ ctx }) => db.listTradeContracts(ctx.user.id)),
    startContract: protectedProcedure.input(z.object({ amount: z.number().finite().positive().min(50) })).mutation(({ ctx, input }) => db.startTradeContract({ userId: ctx.user.id, amount: input.amount })),
    claimDuePayouts: protectedProcedure.mutation(async ({ ctx }) => {
      const result = await db.processDueTradePayouts(new Date(), { userId: ctx.user.id });
      return result;
    }),
  }),
  wallet: router({
    balances: protectedProcedure.query(({ ctx }) => db.getWalletBalances(ctx.user.id)),
    transactions: protectedProcedure.query(({ ctx }) => db.listTransactions(ctx.user.id)),
    createDeposit: protectedProcedure.input(requestInput.extend({ paymentMethod: z.string().max(64).optional() })).mutation(({ ctx, input }) => db.createDepositRequest({ userId: ctx.user.id, ...input })),
    createWithdrawal: protectedProcedure.input(requestInput.extend({ address: z.string().min(20).max(500) })).mutation(async ({ ctx, input }) => {
      const globalLock = await db.getGlobalWithdrawalLock();
      // القفل العام للحسابات القديمة فقط (المنشأة قبل التفعيل)؛ الحسابات الجديدة تسحب عادي
      if (
        globalLock &&
        new Date(ctx.user.createdAt).getTime() <= globalLock.lockedAt.getTime() &&
        !(await db.getGlobalLockExemptIds()).has(ctx.user.id)
      ) {
        const d = globalLock.until;
        const date = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}`;
        throw new TRPCError({ code: "FORBIDDEN", message: `السحب متوقف مؤقتاً حتى ${date}.` });
      }
      if (ctx.user.withdrawalLocked) {
        const lock = await db.getUserWithdrawalLockState(ctx.user.id);
        if (lock.active) {
          const d = lock.until;
          const date = d ? `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${String(d.getUTCDate()).padStart(2, "0")}` : null;
          throw new TRPCError({
            code: "FORBIDDEN",
            message: date ? `السحب من حسابك مقفل مؤقتاً حتى ${date}.` : "السحب من حسابك مقفل مؤقتاً، تواصل مع الدعم.",
          });
        }
      }
      if (ctx.user.isBanned) {
        throw new TRPCError({ code: "FORBIDDEN", message: ctx.user.bannedReason ? `تم حظر هذا الحساب: ${ctx.user.bannedReason}` : "تم حظر هذا الحساب. تواصل مع الدعم." });
      }
      return db.createWithdrawalRequest({ userId: ctx.user.id, ...input });
    }),
    referralStats: protectedProcedure.query(({ ctx }) => db.getReferralStats(ctx.user.id)),
  }),
  admin: router({
    stats: adminProcedure.query(() => db.getAdminStats()),
    globalWithdrawalLock: adminProcedure.query(async () => ({ until: (await db.getGlobalWithdrawalLock())?.until.toISOString() ?? null })),
    lockAllWithdrawals: adminProcedure.input(z.object({ days: z.number().int().min(1).max(365).default(30) }).optional()).mutation(async ({ input }) => ({ until: (await db.setGlobalWithdrawalLock(input?.days ?? 30)).toISOString() })),
    unlockAllWithdrawals: adminProcedure.mutation(async () => { await db.clearGlobalWithdrawalLock(); return { until: null as string | null }; }),
    users: adminProcedure.input(z.object({ search: z.string().max(320).optional() }).optional()).query(async ({ input }) => {
      const list = await db.listUsers(input?.search);
      const globalLock = await db.getGlobalWithdrawalLock();
      if (!globalLock) return list;
      // أثناء القفل العام: يظهر "السحب مقفل" لكل الحسابات المتأثرة ما عدا المستثناة
      const exempt = await db.getGlobalLockExemptIds();
      return list.map((u: any) =>
        !u.withdrawalLocked && new Date(u.createdAt).getTime() <= globalLock.lockedAt.getTime() && !exempt.has(u.id)
          ? { ...u, withdrawalLocked: true }
          : u,
      );
    }),
    userDetail: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ input }) => db.getAdminUserDetail(input.userId)),
    referralsAtLevel: adminProcedure.input(z.object({ userId: z.number().int().positive(), level: z.union([z.literal(1), z.literal(2), z.literal(3)]) })).query(({ input }) => db.getReferralsAtLevel(input.userId, input.level)),
    deposits: adminProcedure.query(() => db.listDepositRequests()),
    withdrawals: adminProcedure.query(() => db.listWithdrawalRequests()),
    approveDeposit: adminProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(({ ctx, input }) => db.approveDeposit(input.requestId, ctx.user.id)),
    rejectDeposit: adminProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(({ ctx, input }) => db.rejectDeposit(input.requestId, ctx.user.id)),
    approveWithdrawal: adminProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(({ ctx, input }) => db.approveWithdrawal(input.requestId, ctx.user.id)),
    rejectWithdrawal: adminProcedure.input(z.object({ requestId: z.number().int().positive() })).mutation(({ ctx, input }) => db.rejectWithdrawal(input.requestId, ctx.user.id)),
    banUser: adminProcedure.input(z.object({ userId: z.number().int().positive(), reason: z.string().max(300).optional() })).mutation(({ input }) => db.banUser(input.userId, input.reason)),
    unbanUser: adminProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ input }) => db.unbanUser(input.userId)),
    lockWithdrawal: adminProcedure.input(z.object({ userId: z.number().int().positive(), days: z.number().int().min(1).max(365).optional() })).mutation(async ({ input }) => { if (input.days) await db.lockWithdrawalTimed(input.userId, input.days); else await db.lockWithdrawal(input.userId); }),
    unlockWithdrawal: adminProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(({ input }) => db.unlockWithdrawal(input.userId)),
    setUserPassword: adminProcedure.input(z.object({ userId: z.number().int().positive(), newPassword: z.string().min(8).max(128) })).mutation(async ({ input }) => { await db.updateUserPassword(input.userId, hashPassword(input.newPassword, LIGHT_COST)); return { success: true } as const; }),
    adjustBalance: adminProcedure.input(z.object({ userId: z.number().int().positive(), currency: z.string().min(2).max(16), amount: z.number().positive().finite(), direction: z.enum(["credit", "debit"]), note: z.string().max(300).optional() })).mutation(({ ctx, input }) => db.adminAdjustBalance({ ...input, adminId: ctx.user.id })),
    sendNotification: adminProcedure.input(z.object({ userId: z.number().int().positive().nullable(), title: z.string().trim().min(1).max(160), message: z.string().trim().min(1).max(2000) })).mutation(({ ctx, input }) => db.sendNotification({ ...input, sentBy: ctx.user.id })),
    listNotifications: adminProcedure.query(() => db.listAllNotifications()),
    deleteNotification: adminProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteNotification(input.notificationId, ctx.user.id)),
  }),
  notifications: router({
    list: protectedProcedure.query(({ ctx }) => db.listNotificationsForUser(ctx.user.id)),
    markRead: protectedProcedure.input(z.object({ notificationId: z.number().int().positive() })).mutation(({ ctx, input }) => db.markNotificationRead(input.notificationId, ctx.user.id)),
  }),
});
export type AppRouter = typeof appRouter;
