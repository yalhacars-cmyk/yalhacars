import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminUser } from "@/lib/admin/auth";
import { listReservationsFn, updateReservationStatusFn } from "@/lib/admin/reservations";
import { formatSar } from "@/lib/i18n/dictionary";
import { paymentMethodLabel } from "@/lib/paymentMethod";
import { useT } from "@/lib/i18n/context";

export const Route = createFileRoute("/admin/reservations")({
  beforeLoad: async () => {
    const user = await getAdminUser();
    if (!user) throw redirect({ to: "/admin/login" });
    return { user };
  },
  loader: () => listReservationsFn(),
  head: () => ({ meta: [{ title: "Reservations — Yalhacar Admin" }] }),
  component: AdminReservations,
});

type Reservation = Awaited<ReturnType<typeof listReservationsFn>>[number];

const statusTone: Record<string, string> = {
  pending: "bg-panel-fg/10 text-panel-fg/70",
  confirmed: "bg-brass/20 text-brass-2",
  cancelled: "bg-destructive/20 text-destructive",
  expired: "bg-destructive/20 text-destructive",
};

function AdminReservations() {
  const reservations = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const t = useT();
  const [statusFilter, setStatusFilter] = useState<"all" | Reservation["status"]>("all");
  const [savingId, setSavingId] = useState<string | null>(null);

  const filtered = useMemo(
    () => reservations.filter((r) => statusFilter === "all" || r.status === statusFilter),
    [reservations, statusFilter],
  );

  const changeStatus = async (r: Reservation, status: Reservation["status"]) => {
    setSavingId(r.id);
    try {
      await updateReservationStatusFn({ data: { id: r.id, carId: r.car_id, status } });
      await router.invalidate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update reservation");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <AdminShell title="Reservations" email={user.email}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="cancelled">Cancelled</option>
          <option value="expired">Expired</option>
        </select>
        <span className="text-xs text-panel-fg/40">{filtered.length} reservations</span>
      </div>

      <div className="overflow-x-auto rounded-panel ring-1 ring-panel-fg/10">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-panel-fg/10 text-left text-[11px] tracking-[0.1em] text-panel-fg/50 uppercase">
              <th className="p-3">Order #</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Payment</th>
              <th className="p-3">Delivery</th>
              <th className="p-3">Placed</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b border-panel-fg/10 last:border-b-0">
                <td className="num p-3 font-medium">{r.order_number}</td>
                <td className="p-3">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-panel-fg/50" dir="ltr">
                    {r.phone}
                  </div>
                </td>
                <td className="num p-3">{formatSar(r.amount)}</td>
                <td className="p-3 text-panel-fg/70" title={r.provider_ref ?? undefined}>
                  {paymentMethodLabel(r.payment_method, t)}
                </td>
                <td className="p-3 text-panel-fg/70 capitalize">{r.delivery_type}</td>
                <td className="p-3 text-panel-fg/60">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${statusTone[r.status]}`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="p-3">
                  {r.status === "pending" ? (
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={savingId === r.id}
                        onClick={() => changeStatus(r, "confirmed")}
                        className="rounded-control bg-brass px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-brass-2 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        disabled={savingId === r.id}
                        onClick={() => changeStatus(r, "cancelled")}
                        className="rounded-control bg-panel-2 px-2.5 py-1.5 text-xs font-medium text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-destructive disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="text-right text-panel-fg/30">—</div>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-panel-fg/50">
                  No reservations match.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
