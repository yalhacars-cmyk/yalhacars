import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useViewMode } from "./use-view-mode";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useViewMode", () => {
  it("defaults to list", () => {
    const { result } = renderHook(() => useViewMode("inventory"));
    expect(result.current[0]).toBe("list");
  });

  it("honours a custom default", () => {
    const { result } = renderHook(() => useViewMode("inventory", "grid"));
    expect(result.current[0]).toBe("grid");
  });

  it("restores a stored preference", () => {
    window.localStorage.setItem("admin-view-mode:inventory", "grid");
    const { result } = renderHook(() => useViewMode("inventory"));
    expect(result.current[0]).toBe("grid");
  });

  it("ignores a stored value that isn't a valid mode", () => {
    window.localStorage.setItem("admin-view-mode:inventory", "carousel");
    const { result } = renderHook(() => useViewMode("inventory"));
    expect(result.current[0]).toBe("list");
  });

  it("persists a change and updates state", () => {
    const { result } = renderHook(() => useViewMode("inventory"));
    act(() => result.current[1]("grid"));
    expect(result.current[0]).toBe("grid");
    expect(window.localStorage.getItem("admin-view-mode:inventory")).toBe("grid");
  });

  it("keeps each page's preference independent", () => {
    const inventory = renderHook(() => useViewMode("inventory"));
    const leads = renderHook(() => useViewMode("leads"));
    act(() => inventory.result.current[1]("grid"));
    expect(inventory.result.current[0]).toBe("grid");
    expect(leads.result.current[0]).toBe("list");
    expect(window.localStorage.getItem("admin-view-mode:leads")).toBeNull();
  });

  it("falls back to the default when storage throws on read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useViewMode("inventory", "grid"));
    expect(result.current[0]).toBe("grid");
  });

  it("still updates in-memory state when storage throws on write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const { result } = renderHook(() => useViewMode("inventory"));
    expect(() => act(() => result.current[1]("grid"))).not.toThrow();
    expect(result.current[0]).toBe("grid");
  });
});
