import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import type { TrpcContext } from "../server/_core/context";

function context(user: TrpcContext["user"]): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("CwaAX wallet access control", () => {
  it("rejects admin requests without a signed-in user", async () => {
    const caller = appRouter.createCaller(context(null));
    await expect(caller.admin.deposits()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects admin requests for a regular user", async () => {
    const caller = appRouter.createCaller(context({
      id: 7,
      openId: "regular-user",
      name: "Regular User",
      email: "user@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    }));
    await expect(caller.admin.withdrawals()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
