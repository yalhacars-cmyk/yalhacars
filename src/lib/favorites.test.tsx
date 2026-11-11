import { act, cleanup, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setFavoriteFn } from "@/lib/favoritesData";
import { FavoritesProvider, useFavorites } from "./favorites";

vi.mock("@/lib/favoritesData", () => ({
  setFavoriteFn: vi.fn(),
}));

const mockedSetFavoriteFn = vi.mocked(setFavoriteFn);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.clearAllMocks();
});

function Probe() {
  const { ids, isFavorite, toggleFavorite } = useFavorites();
  return (
    <div>
      <span data-testid="ids">{ids.join(",")}</span>
      <button onClick={() => toggleFavorite("car-1")}>toggle car-1</button>
      <span data-testid="is-fav">{isFavorite("car-1") ? "yes" : "no"}</span>
    </div>
  );
}

describe("useFavorites outside a provider", () => {
  it("throws a clear error", () => {
    expect(() => renderHook(() => useFavorites())).toThrow(/within a FavoritesProvider/);
  });
});

describe("FavoritesProvider — signed out", () => {
  it("starts empty and ignores initialIds (those are the signed-in visitor's, not this browser's)", () => {
    render(
      <FavoritesProvider signedIn={false} initialIds={["should-not-appear"]}>
        <Probe />
      </FavoritesProvider>,
    );
    expect(screen.getByTestId("ids").textContent).toBe("");
  });

  it("toggling writes straight to localStorage, never calls the server function", async () => {
    const user = userEvent.setup();
    render(
      <FavoritesProvider signedIn={false} initialIds={[]}>
        <Probe />
      </FavoritesProvider>,
    );

    await user.click(screen.getByText("toggle car-1"));
    expect(screen.getByTestId("is-fav").textContent).toBe("yes");
    expect(JSON.parse(window.localStorage.getItem("yalhacar-favorites") ?? "[]")).toEqual([
      "car-1",
    ]);
    expect(mockedSetFavoriteFn).not.toHaveBeenCalled();

    await user.click(screen.getByText("toggle car-1"));
    expect(screen.getByTestId("is-fav").textContent).toBe("no");
    expect(JSON.parse(window.localStorage.getItem("yalhacar-favorites") ?? "[]")).toEqual([]);
  });
});

describe("FavoritesProvider — signed in", () => {
  beforeEach(() => {
    mockedSetFavoriteFn.mockResolvedValue(undefined);
  });

  it("starts from the server-provided initialIds", () => {
    render(
      <FavoritesProvider signedIn={true} initialIds={["car-1"]}>
        <Probe />
      </FavoritesProvider>,
    );
    expect(screen.getByTestId("is-fav").textContent).toBe("yes");
  });

  it("applies the toggle optimistically, then calls setFavoriteFn with the right payload", async () => {
    const user = userEvent.setup();
    render(
      <FavoritesProvider signedIn={true} initialIds={[]}>
        <Probe />
      </FavoritesProvider>,
    );

    await user.click(screen.getByText("toggle car-1"));
    expect(screen.getByTestId("is-fav").textContent).toBe("yes");
    expect(mockedSetFavoriteFn).toHaveBeenCalledWith({
      data: { car_id: "car-1", favorited: true },
    });
  });

  it("rolls back the optimistic update if the server call fails", async () => {
    mockedSetFavoriteFn.mockRejectedValueOnce(new Error("network down"));
    const user = userEvent.setup();
    render(
      <FavoritesProvider signedIn={true} initialIds={[]}>
        <Probe />
      </FavoritesProvider>,
    );

    await act(async () => {
      await user.click(screen.getByText("toggle car-1"));
    });

    await waitFor(() => expect(screen.getByTestId("is-fav").textContent).toBe("no"));
  });
});
