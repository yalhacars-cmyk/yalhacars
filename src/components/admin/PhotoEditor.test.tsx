import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadCarImageFn } from "@/lib/admin/storage";
import { PhotoEditor } from "./PhotoEditor";

vi.mock("@/lib/admin/storage", () => ({
  uploadCarImageFn: vi.fn(),
  uploadAdminImageFn: vi.fn(),
}));

/**
 * jsdom never actually loads image bytes — `new Image()` sits inert unless
 * something fires load/error on it. This stand-in lets each test decide
 * which photo (the car photo vs. the fixed /brand/logo-watermark.png overlay)
 * succeeds or fails, and on what timing, without a real network.
 */
class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 800;
  naturalHeight = 600;
  crossOrigin: string | null = null;
  private _src = "";
  get src() {
    return this._src;
  }
  set src(value: string) {
    this._src = value;
    const outcome = MockImage.outcomes[value] ?? "load";
    queueMicrotask(() => {
      if (outcome === "load") this.onload?.();
      else this.onerror?.();
    });
  }
  static outcomes: Record<string, "load" | "error"> = {};
}

const CAR_PHOTO = "https://example.com/car.jpg";

beforeEach(() => {
  MockImage.outcomes = {};
  vi.stubGlobal("Image", MockImage);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PhotoEditor", () => {
  it("shows a loading state before both images resolve", () => {
    render(
      <PhotoEditor imageUrl={CAR_PHOTO} bucket="car-images" onSaved={vi.fn()} onClose={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("enables Save and shows the logo controls once loaded", async () => {
    render(
      <PhotoEditor imageUrl={CAR_PHOTO} bucket="car-images" onSaved={vi.fn()} onClose={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());
    expect(screen.getByText("Add logo watermark")).toBeInTheDocument();
    expect(screen.getByText("Reset position")).toBeInTheDocument();
  });

  it("shows an error if the car photo fails to load", async () => {
    MockImage.outcomes[CAR_PHOTO] = "error";
    render(
      <PhotoEditor imageUrl={CAR_PHOTO} bucket="car-images" onSaved={vi.fn()} onClose={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByText(/Failed to load/)).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("shows an error if the logo overlay fails to load", async () => {
    MockImage.outcomes["/brand/logo-watermark.png"] = "error";
    render(
      <PhotoEditor imageUrl={CAR_PHOTO} bucket="car-images" onSaved={vi.fn()} onClose={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByText(/Failed to load/)).toBeInTheDocument());
  });

  it("hides the size slider and reset button when the watermark is toggled off", async () => {
    const user = userEvent.setup();
    render(
      <PhotoEditor imageUrl={CAR_PHOTO} bucket="car-images" onSaved={vi.fn()} onClose={vi.fn()} />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());

    await user.click(screen.getByLabelText("Add logo watermark"));
    expect(screen.queryByText("Reset position")).not.toBeInTheDocument();
  });

  it("calls onClose without uploading anything when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PhotoEditor imageUrl={CAR_PHOTO} bucket="car-images" onSaved={vi.fn()} onClose={onClose} />,
    );
    await waitFor(() => expect(screen.getByRole("button", { name: "Save" })).toBeEnabled());

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(uploadCarImageFn).not.toHaveBeenCalled();
  });

  it("calls onClose via the X button too", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <PhotoEditor imageUrl={CAR_PHOTO} bucket="car-images" onSaved={vi.fn()} onClose={onClose} />,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
