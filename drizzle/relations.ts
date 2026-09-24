import { relations } from "drizzle-orm";

import {
  users,
  walletBalances,
  depositRequests,
  withdrawalRequests,
  transactions,
  auditLogs,
  tradeContracts,
  tradePayouts,
} from "./schema";

export const usersRelations = relations(
  users,
  ({ many }) => ({
    walletBalances: many(walletBalances),
    depositRequests: many(depositRequests),
    withdrawalRequests: many(withdrawalRequests),
    transactions: many(transactions),
    auditLogs: many(auditLogs),
  }),
);

export const walletBalancesRelations = relations(
  walletBalances,
  ({ one }) => ({
    user: one(users, {
      fields: [walletBalances.userId],
      references: [users.id],
    }),
  }),
);

export const depositRequestsRelations = relations(
  depositRequests,
  ({ one }) => ({
    user: one(users, {
      fields: [depositRequests.userId],
      references: [users.id],
    }),

    admin: one(users, {
      fields: [depositRequests.approvedBy],
      references: [users.id],
    }),
  }),
);

export const withdrawalRequestsRelations =
  relations(
    withdrawalRequests,
    ({ one }) => ({
      user: one(users, {
        fields: [
          withdrawalRequests.userId,
        ],
        references: [users.id],
      }),

      admin: one(users, {
        fields: [
          withdrawalRequests.approvedBy,
        ],
        references: [users.id],
      }),
    }),
  );

export const transactionsRelations = relations(
  transactions,
  ({ one }) => ({
    user: one(users, {
      fields: [transactions.userId],
      references: [users.id],
    }),

    admin: one(users, {
      fields: [transactions.adminId],
      references: [users.id],
    }),
  }),
);

export const auditLogsRelations = relations(
  auditLogs,
  tradeContracts,
  tradePayouts,
  ({ one }) => ({
    admin: one(users, {
      fields: [auditLogs.adminId],
      references: [users.id],
    }),
  }),
);


export const tradeContractsRelations = relations(tradeContracts, ({ one, many }) => ({
  user: one(users, { fields: [tradeContracts.userId], references: [users.id] }),
  payouts: many(tradePayouts),
}));

export const tradePayoutsRelations = relations(tradePayouts, ({ one }) => ({
  contract: one(tradeContracts, { fields: [tradePayouts.contractId], references: [tradeContracts.id] }),
  user: one(users, { fields: [tradePayouts.userId], references: [users.id] }),
}));
