/**
 * Stand-in for `createServerFn` from "@tanstack/react-start", so a server
 * function can be called like a plain async function in a unit test:
 *
 *   vi.mock("@tanstack/react-start", async () =>
 *     (await import("@/test/serverFnMock")).tanstackStartMock);
 *
 * The real builder wires up RPC, cookies and CSRF; none of that is what these
 * tests are about. What matters is preserved: `.validator(schema)` really runs
 * `schema.parse` on the input (so validation failures reject, and zod strips
 * unknown keys exactly as in production), then the handler runs.
 */
type Parser = { parse: (input: unknown) => unknown };

export const tanstackStartMock = {
  createServerFn: () => {
    let parser: Parser | undefined;
    const builder = {
      validator(schema: Parser) {
        parser = schema;
        return builder;
      },
      handler(fn: (ctx: { data: unknown }) => unknown) {
        return async (opts?: { data?: unknown }) =>
          fn({ data: parser ? parser.parse(opts?.data) : opts?.data });
      },
    };
    return builder;
  },
};
