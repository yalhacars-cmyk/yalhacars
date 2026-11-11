import { describe, expect, it } from "vitest";
import { renderErrorPage } from "./error-page";

describe("renderErrorPage", () => {
  const html = renderErrorPage();

  it("is a complete HTML document", () => {
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain('<meta charset="utf-8"');
    expect(html).toContain("</html>");
  });

  it("lets the visitor retry or go home", () => {
    expect(html).toContain("location.reload()");
    expect(html).toContain('href="/"');
  });

  it("is self-contained: no external scripts, styles or other network requests", () => {
    // It renders when the app itself is broken, so it can't depend on the app's assets.
    expect(html).not.toMatch(/<script[^>]+src=/i);
    expect(html).not.toMatch(/<link[^>]+href=/i);
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("does not leak error details", () => {
    expect(html).not.toMatch(/stack|Error:|at .*\(/);
  });
});
