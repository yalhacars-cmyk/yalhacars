import { vi } from "vitest";

/**
 * A recording fake of the slice of the Supabase client this app uses. Every
 * query chain (`from("cars").update({...}).eq("id", 1)`) is recorded per table
 * and resolves to whatever `tables[table]` says — so a test can both feed
 * data/errors in and assert exactly what was written, without a network.
 */
type Result = { data?: unknown; error?: { message: string } | null };
type Op = { method: string; args: unknown[] };
type User = { id: string; email?: string };

export function fakeSupabase(
  opts: {
    user?: User | null;
    authError?: { message: string } | null;
    tables?: Record<string, Result>;
    rpc?: Record<string, Result>;
  } = {},
) {
  const calls: { table: string; ops: Op[] }[] = [];

  const chain = (call: { table: string; ops: Op[] }): unknown =>
    new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            const result = opts.tables?.[call.table] ?? {};
            return (resolve: (value: unknown) => void) =>
              resolve({ data: result.data ?? null, error: result.error ?? null });
          }
          return (...args: unknown[]) => {
            call.ops.push({ method: String(prop), args });
            return chain(call);
          };
        },
      },
    );

  const client = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: opts.user ?? null },
        error: opts.authError ?? null,
      })),
    },
    from(table: string) {
      const call = { table, ops: [] as Op[] };
      calls.push(call);
      return chain(call);
    },
    rpc: vi.fn(async (fn: string, _args?: Record<string, unknown>) => {
      const result = opts.rpc?.[fn] ?? {};
      return { data: result.data ?? null, error: result.error ?? null };
    }),
    storage: {
      from: vi.fn((bucket: string) => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.test/${bucket}/${path}` },
        }),
      })),
    },

    /** Args of every `method(...)` call made on `table`, in order. */
    argsOf(table: string, method: string): unknown[][] {
      return calls
        .filter((c) => c.table === table)
        .flatMap((c) => c.ops.filter((o) => o.method === method).map((o) => o.args));
    },
    /** Tables that were queried at all. */
    tablesTouched(): string[] {
      return [...new Set(calls.map((c) => c.table))];
    },
  };

  return client;
}

export type FakeSupabase = ReturnType<typeof fakeSupabase>;
