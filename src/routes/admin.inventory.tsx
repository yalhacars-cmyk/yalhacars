import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Check, ImageOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CarForm } from "@/components/admin/CarForm";
import { ViewToggle } from "@/components/admin/ViewToggle";
import { carAvailability, type Car } from "@/data/cars";
import { useViewMode } from "@/hooks/use-view-mode";
import { getAdminUser } from "@/lib/admin/auth";
import {
  approveCarFn,
  carToInput,
  type CarInput,
  createCarFn,
  deleteCarFn,
  listAllCarsFn,
  updateCarFn,
} from "@/lib/admin/cars";
import { formatSar } from "@/lib/i18n/dictionary";

export const Route = createFileRoute("/admin/inventory")({
  beforeLoad: async () => {
    const user = await getAdminUser();
    if (!user) throw redirect({ to: "/admin/login" });
    return { user };
  },
  loader: () => listAllCarsFn(),
  head: () => ({ meta: [{ title: "Inventory — Yalhacar Admin" }] }),
  component: AdminInventory,
});

type Mode = { kind: "list" } | { kind: "create" } | { kind: "edit"; car: Car };

const statusTone: Record<string, string> = {
  available: "bg-brass/20 text-brass-2",
  reserved: "bg-panel-fg/10 text-panel-fg/70",
  sold: "bg-destructive/20 text-destructive",
};

function AdminInventory() {
  const cars = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useViewMode("inventory", "grid");

  const refresh = () => router.invalidate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cars;
    return cars.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.stock.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.make.toLowerCase().includes(q),
    );
  }, [cars, query]);

  const handleCreate = async (input: CarInput) => {
    setSubmitting(true);
    try {
      await createCarFn({ data: input });
      setMode({ kind: "list" });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (originalId: string, input: CarInput) => {
    setSubmitting(true);
    try {
      await updateCarFn({ data: { ...input, originalId } });
      setMode({ kind: "list" });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update listing");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteCarFn({ data: { id } });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete listing");
    } finally {
      setDeletingId(null);
    }
  };

  const handleApprove = async (car: Car) => {
    setApprovingId(car.id);
    try {
      await approveCarFn({ data: { id: car.id } });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to approve listing");
    } finally {
      setApprovingId(null);
    }
  };

  const toggleAvailability = async (car: Car) => {
    const next = carAvailability(car) === "available" ? "sold" : "available";
    try {
      await updateCarFn({ data: { ...carToInput(car), availability: next, originalId: car.id } });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
    }
  };

  return (
    <AdminShell title="Inventory" email={user.email}>
      {mode.kind === "create" ? (
        <>
          <h1 className="mb-4 font-display text-xl font-semibold">New listing</h1>
          <CarForm
            submitting={submitting}
            onCancel={() => setMode({ kind: "list" })}
            onSubmit={handleCreate}
          />
        </>
      ) : mode.kind === "edit" ? (
        <>
          <h1 className="mb-4 font-display text-xl font-semibold">Edit listing</h1>
          <CarForm
            initial={mode.car}
            submitting={submitting}
            onCancel={() => setMode({ kind: "list" })}
            onSubmit={(input) => handleUpdate(mode.car.id, input)}
          />
        </>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="font-display text-xl font-semibold">
              Listings <span className="text-panel-fg/40">({filtered.length})</span>
            </h1>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-panel-fg/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search make, title, stock, city…"
                  className="w-56 rounded-control bg-panel-2 py-2 pe-3 ps-9 text-sm outline-none ring-1 ring-panel-fg/10 placeholder:text-panel-fg/40"
                />
              </div>
              <ViewToggle mode={viewMode} onChange={setViewMode} />
              <button
                type="button"
                onClick={() => setMode({ kind: "create" })}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-control bg-brass px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brass-2"
              >
                <Plus className="size-4" /> Add car
              </button>
            </div>
          </div>

          {viewMode === "grid" ? (
            filtered.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((car) => {
                  const status = carAvailability(car);
                  const pending = (car.status ?? "approved") === "pending";
                  return (
                    <div
                      key={car.id}
                      className={`overflow-hidden rounded-panel ring-1 ring-panel-fg/10 ${
                        pending ? "bg-brass/5" : "bg-panel-2"
                      }`}
                    >
                      <div className="relative aspect-[4/3] bg-panel">
                        {car.image || car.photo_urls?.[0] ? (
                          <img
                            src={car.image || car.photo_urls?.[0]}
                            alt={car.title}
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="grid size-full place-items-center text-panel-fg/30">
                            <ImageOff className="size-8" />
                          </div>
                        )}
                        {pending ? (
                          <span className="absolute top-2 start-2 rounded-full bg-brass px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                            Pending
                          </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => toggleAvailability(car)}
                          title="Click to toggle available / sold"
                          className={`absolute top-2 end-2 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${statusTone[status]}`}
                        >
                          {status}
                        </button>
                      </div>
                      <div className="p-3">
                        <div className="truncate text-sm font-medium">{car.title}</div>
                        <div className="truncate text-xs text-panel-fg/45">
                          {car.stock} · {car.city}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="num font-display text-base font-semibold">
                            {formatSar(car.price)}
                          </span>
                          <span className="text-xs text-panel-fg/60">{car.condition}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          {pending ? (
                            <button
                              type="button"
                              onClick={() => handleApprove(car)}
                              disabled={approvingId === car.id}
                              className="inline-flex flex-1 items-center justify-center gap-1 rounded-control bg-brass/20 px-2 py-1.5 text-[11px] font-medium text-brass-2 transition-colors hover:bg-brass hover:text-white disabled:opacity-50"
                            >
                              <Check className="size-3" /> Approve
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setMode({ kind: "edit", car })}
                            aria-label="Edit"
                            className="grid size-8 shrink-0 place-items-center rounded-control text-panel-fg/60 ring-1 ring-panel-fg/10 hover:text-panel-fg"
                          >
                            <Pencil className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(car.id)}
                            disabled={deletingId === car.id}
                            aria-label="Delete"
                            className="grid size-8 shrink-0 place-items-center rounded-control text-panel-fg/60 ring-1 ring-panel-fg/10 hover:text-destructive disabled:opacity-50"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-panel p-8 text-center text-panel-fg/50 ring-1 ring-panel-fg/10">
                No listings match.
              </div>
            )
          ) : (
            <div className="overflow-x-auto rounded-panel ring-1 ring-panel-fg/10">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-panel-fg/10 text-left text-[11px] tracking-[0.1em] text-panel-fg/50 uppercase">
                    <th className="p-3">Vehicle</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Condition</th>
                    <th className="p-3">Moderation</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((car) => {
                    const status = carAvailability(car);
                    const pending = (car.status ?? "approved") === "pending";
                    return (
                      <tr
                        key={car.id}
                        className={`border-b border-panel-fg/10 last:border-b-0 ${pending ? "bg-brass/5" : ""}`}
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {car.image || car.photo_urls?.[0] ? (
                              <img
                                src={car.image || car.photo_urls?.[0]}
                                alt={car.title}
                                className="size-12 shrink-0 rounded-control object-cover"
                              />
                            ) : (
                              <div className="grid size-12 shrink-0 place-items-center rounded-control bg-panel text-panel-fg/30 ring-1 ring-panel-fg/10">
                                <ImageOff className="size-4" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium">{car.title}</div>
                              <div className="text-xs text-panel-fg/45">{car.stock}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-panel-fg/70">{car.city}</td>
                        <td className="num p-3 font-medium">{formatSar(car.price)}</td>
                        <td className="p-3 text-panel-fg/70">{car.condition}</td>
                        <td className="p-3">
                          {pending ? (
                            <button
                              type="button"
                              onClick={() => handleApprove(car)}
                              disabled={approvingId === car.id}
                              title="Publish this listing"
                              className="inline-flex items-center gap-1 rounded-full bg-brass/20 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-brass-2 transition-colors hover:bg-brass hover:text-white disabled:opacity-50"
                            >
                              <Check className="size-3" /> Approve
                            </button>
                          ) : (
                            <span className="rounded-full bg-panel-fg/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-panel-fg/70">
                              approved
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => toggleAvailability(car)}
                            title="Click to toggle available / sold"
                            className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${statusTone[status]}`}
                          >
                            {status}
                          </button>
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setMode({ kind: "edit", car })}
                              aria-label="Edit"
                              className="grid size-8 place-items-center rounded-control text-panel-fg/60 ring-1 ring-panel-fg/10 hover:text-panel-fg"
                            >
                              <Pencil className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(car.id)}
                              disabled={deletingId === car.id}
                              aria-label="Delete"
                              className="grid size-8 place-items-center rounded-control text-panel-fg/60 ring-1 ring-panel-fg/10 hover:text-destructive disabled:opacity-50"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-panel-fg/50">
                        No listings match.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
