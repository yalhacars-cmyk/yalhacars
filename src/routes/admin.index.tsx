import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Car, Inbox, ReceiptText, TrendingUp } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { carAvailability } from "@/data/cars";
import { getAdminUser } from "@/lib/admin/auth";
import { listAllCarsFn } from "@/lib/admin/cars";
import { listLeadsFn } from "@/lib/admin/leads";
import { listReservationsFn } from "@/lib/admin/reservations";
import { formatSar } from "@/lib/i18n/dictionary";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    const user = await getAdminUser();
    if (!user) throw redirect({ to: "/admin/login" });
    return { user };
  },
  loader: async () => {
    const [cars, leads, reservations] = await Promise.all([
      listAllCarsFn(),
      listLeadsFn(),
      listReservationsFn(),
    ]);
    return { cars, leads, reservations };
  },
  head: () => ({ meta: [{ title: "Admin Dashboard — Yalhacar" }] }),
  component: AdminDashboard,
});

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function AdminDashboard() {
  const { cars, leads, reservations } = Route.useLoaderData();
  const { user } = Route.useRouteContext();

  const available = cars.filter((c) => carAvailability(c) === "available").length;
  const reserved = cars.filter((c) => carAvailability(c) === "reserved").length;
  const sold = cars.filter((c) => carAvailability(c) === "sold").length;
  const pendingCars = cars.filter((c) => (c.status ?? "approved") === "pending").length;

  const newLeads = leads.filter((l) => l.status === "new").length;
  const weekAgo = Date.now() - WEEK_MS;
  const leadsThisWeek = leads.filter((l) => new Date(l.created_at).getTime() >= weekAgo).length;

  const pendingReservations = reservations.filter((r) => r.status === "pending").length;
  const confirmedReservations = reservations.filter((r) => r.status === "confirmed").length;
  const gmv = reservations
    .filter((r) => r.status === "confirmed")
    .reduce((sum, r) => sum + (r.amount ?? 0), 0);

  return (
    <AdminShell title="Dashboard" email={user.email}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={Car}
          label="Inventory"
          value={String(cars.length)}
          breakdown={
            pendingCars > 0
              ? `${pendingCars} pending review · ${available} available · ${sold} sold`
              : `${available} available · ${reserved} reserved · ${sold} sold`
          }
          to="/admin/inventory"
        />
        <KpiCard
          icon={Inbox}
          label="Leads"
          value={String(leads.length)}
          breakdown={`${newLeads} new · ${leadsThisWeek} this week`}
          to="/admin/leads"
        />
        <KpiCard
          icon={ReceiptText}
          label="Reservations"
          value={String(reservations.length)}
          breakdown={`${pendingReservations} pending · ${confirmedReservations} confirmed`}
          to="/admin/reservations"
        />
        <KpiCard
          icon={TrendingUp}
          label="Confirmed GMV"
          value={formatSar(gmv)}
          breakdown="From confirmed reservations"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-panel bg-panel-2 p-5 ring-1 ring-panel-fg/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Recent leads</h2>
            <Link
              to="/admin/leads"
              className="text-xs font-medium text-panel-accent hover:underline"
            >
              View all →
            </Link>
          </div>
          {leads.length === 0 ? (
            <p className="text-sm text-panel-fg/50">No leads yet.</p>
          ) : (
            <ul className="space-y-2">
              {leads.slice(0, 5).map((lead) => (
                <li
                  key={lead.id}
                  className="flex items-center justify-between rounded-control bg-panel px-3 py-2.5 text-sm ring-1 ring-panel-fg/10"
                >
                  <div>
                    <div className="font-medium">{lead.name}</div>
                    <div className="text-xs text-panel-fg/50">{lead.type.replace(/_/g, " ")}</div>
                  </div>
                  <StatusBadge value={lead.status} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-panel bg-panel-2 p-5 ring-1 ring-panel-fg/10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Recent reservations</h2>
            <Link
              to="/admin/reservations"
              className="text-xs font-medium text-panel-accent hover:underline"
            >
              View all →
            </Link>
          </div>
          {reservations.length === 0 ? (
            <p className="text-sm text-panel-fg/50">No reservations yet.</p>
          ) : (
            <ul className="space-y-2">
              {reservations.slice(0, 5).map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-control bg-panel px-3 py-2.5 text-sm ring-1 ring-panel-fg/10"
                >
                  <div>
                    <div className="num font-medium">{r.order_number}</div>
                    <div className="text-xs text-panel-fg/50">{r.name}</div>
                  </div>
                  <StatusBadge value={r.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  breakdown,
  to,
}: {
  icon: typeof Car;
  label: string;
  value: string;
  breakdown: string;
  to?: "/admin/inventory" | "/admin/leads" | "/admin/reservations";
}) {
  const content = (
    <div className="rounded-panel bg-panel-2 p-5 ring-1 ring-panel-fg/10 transition-colors hover:ring-panel-fg/25">
      <div className="flex items-center justify-between">
        <span className="text-[11px] tracking-[0.14em] text-panel-fg/50 uppercase">{label}</span>
        <Icon className="size-4 text-panel-accent" />
      </div>
      <div className="num mt-2 font-display text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-panel-fg/50">{breakdown}</div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "confirmed" || value === "closed"
      ? "bg-brass/20 text-brass-2"
      : value === "cancelled" || value === "expired"
        ? "bg-destructive/20 text-destructive"
        : "bg-panel-fg/10 text-panel-fg/70";
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${tone}`}
    >
      {value}
    </span>
  );
}
