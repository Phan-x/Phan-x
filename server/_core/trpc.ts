import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, AUTH_CHECK_FAILED_ERR_MSG } from "../../shared/const.js";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter(opts) {
    const { shape, error } = opts;

    // Never leak internal details (raw SQL, connection strings, stack
    // traces, etc.) to the client for unexpected server errors. Known,
    // intentional errors (bad login, forbidden, not found...) already
    // carry a safe, user-facing message and are left untouched.
    if (error.code === "INTERNAL_SERVER_ERROR") {
      return {
        ...shape,
        message: "حدث خطأ غير متوقع، الرجاء المحاولة مرة أخرى",
      };
    }

    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    if (ctx.authError) {
      // We couldn't verify the session because of an unexpected error
      // (e.g. the database was momentarily unreachable) — this is not
      // the same as "you're not logged in", and retrying the request
      // usually succeeds.
      throw new TRPCError({ code: "UNAUTHORIZED", message: AUTH_CHECK_FAILED_ERR_MSG });
    }

    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user) {
      if (ctx.authError) {
        // Same distinction as requireUser: a transient failure while
        // checking the session must never be reported as "not admin".
        throw new TRPCError({ code: "UNAUTHORIZED", message: AUTH_CHECK_FAILED_ERR_MSG });
      }

      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }

    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
