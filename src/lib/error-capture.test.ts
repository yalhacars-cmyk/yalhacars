import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// error-capture.ts wraps console.error at import time and binds the *original*
// once, so the spy has to be installed before the module is loaded — otherwise
// every test that logs an error would spam the real console.
const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
let mod: typeof import("./error-capture");

beforeAll(async () => {
  mod = await import("./error-capture");
});

afterEach(() => {
  vi.useRealTimers();
  mod.consumeLastCapturedError(); // don't leak a captured error into the next test
  consoleError.mockClear();
});

describe("describeError", () => {
  it("includes the message and stack of an Error", () => {
    const error = new Error("boom");
    const text = mod.describeError(error);
    expect(text).toContain("boom");
    expect(text).toContain(error.stack!.split("\n")[1]!.trim());
  });

  it("walks the cause chain, labelling each link", () => {
    const root = new Error("db down");
    const wrapped = new Error("query failed", { cause: root });
    const text = mod.describeError(new Error("request failed", { cause: wrapped }));
    expect(text).toContain("request failed");
    expect(text).toContain("caused by: Error: query failed");
    expect(text).toContain("caused by: Error: db down");
  });

  it("stops after 5 links so a cyclic cause chain cannot loop forever", () => {
    const a = new Error("a");
    const b = new Error("b", { cause: a });
    (a as { cause?: unknown }).cause = b;
    const text = mod.describeError(a);
    expect(text.match(/caused by:/g)).toHaveLength(4);
  });

  it("appends an HTTP status from `status` or `statusCode`", () => {
    expect(mod.describeError(Object.assign(new Error("nope"), { status: 404 }))).toContain(
      "(status 404)",
    );
    expect(mod.describeError(Object.assign(new Error("nope"), { statusCode: 500 }))).toContain(
      "(status 500)",
    );
  });

  it("ignores a non-numeric status", () => {
    expect(mod.describeError(Object.assign(new Error("nope"), { status: "bad" }))).not.toContain(
      "(status",
    );
  });

  it("describes non-Error values", () => {
    expect(mod.describeError("plain string")).toBe("plain string");
    expect(mod.describeError({ code: 7 })).toBe('{"code":7}');
  });

  it("does not throw on a value JSON.stringify cannot handle", () => {
    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    expect(mod.describeError(circular)).toBe("[object Object]");
  });

  it("returns an empty string for null/undefined", () => {
    expect(mod.describeError(null)).toBe("");
    expect(mod.describeError(undefined)).toBe("");
  });

  it("truncates very long output to 8000 characters", () => {
    expect(mod.describeError("x".repeat(20_000))).toHaveLength(8_000);
  });
});

describe("console.error wrapper", () => {
  it("expands an Error argument into a string with its stack before logging", () => {
    console.error("context:", new Error("kaboom"));
    const [label, expanded] = consoleError.mock.calls[0]!;
    expect(label).toBe("context:");
    expect(typeof expanded).toBe("string");
    expect(expanded).toContain("kaboom");
  });

  it("passes non-Error arguments through untouched", () => {
    const payload = { a: 1 };
    console.error("plain", payload);
    expect(consoleError.mock.calls[0]).toEqual(["plain", payload]);
  });

  it("records the logged Error for consumeLastCapturedError", () => {
    const error = new Error("recorded");
    console.error(error);
    expect(mod.consumeLastCapturedError()).toBe(error);
  });
});

describe("consumeLastCapturedError", () => {
  it("returns undefined when nothing was captured", () => {
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("hands the error out once, then forgets it", () => {
    const error = new Error("once");
    console.error(error);
    expect(mod.consumeLastCapturedError()).toBe(error);
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("keeps only the most recent error", () => {
    console.error(new Error("first"));
    const second = new Error("second");
    console.error(second);
    expect(mod.consumeLastCapturedError()).toBe(second);
  });

  it("expires an error after 5 seconds", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    console.error(new Error("stale"));
    vi.advanceTimersByTime(5_001);
    expect(mod.consumeLastCapturedError()).toBeUndefined();
  });

  it("still returns an error just inside the 5 second window", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const error = new Error("fresh");
    console.error(error);
    vi.advanceTimersByTime(4_999);
    expect(mod.consumeLastCapturedError()).toBe(error);
  });

  it("captures uncaught window errors and unhandled rejections", () => {
    const uncaught = new Error("uncaught");
    window.dispatchEvent(new ErrorEvent("error", { error: uncaught }));
    expect(mod.consumeLastCapturedError()).toBe(uncaught);

    const reason = new Error("rejected");
    const event = new Event("unhandledrejection") as Event & { reason: unknown };
    event.reason = reason;
    window.dispatchEvent(event);
    expect(mod.consumeLastCapturedError()).toBe(reason);
  });
});
