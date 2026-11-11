import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminUser } from "@/lib/admin/auth";
import { formatSar } from "@/lib/i18n/dictionary";
import {
  type CustomerOrder,
  deleteFavoriteFn,
  type Favorite,
  type FinanceApplication,
  listFavoritesFn,
  listFinanceApplicationsFn,
  listOrdersFn,
  listTestDriveBookingsFn,
  type TestDriveBooking,
  updateFinanceApplicationStatusFn,
  updateOrderStatusFn,
  updateTestDriveBookingStatusFn,
} from "@/lib/admin/customerActivity";

export const Route = createFileRoute("/admin/activity")({
  beforeLoad: async () => {
    const user = await getAdminUser();
    if (!user) throw redirect({ to: "/admin/login" });
    return { user };
  },
  loader: async () => {
    const [orders, finance, testDrives, favorites] = await Promise.all([
      listOrdersFn(),
      listFinanceApplicationsFn(),
      listTestDriveBookingsFn(),
      listFavoritesFn(),
    ]);
    return { orders, finance, testDrives, favorites };
  },
  head: () => ({ meta: [{ title: "Activity — Yalhacar Admin" }] }),
  component: AdminActivity,
});

const TABS = ["orders", "finance", "testDrives", "favorites"] as const;
type Tab = (typeof TABS)[number];

function AdminActivity() {
  const { orders, finance, testDrives, favorites } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");
  const refresh = () => router.invalidate();

  const tabLabel: Record<Tab, string> = {
    orders: `Orders (${orders.length})`,
    finance: `Finance (${finance.length})`,
    testDrives: `Test drives (${testDrives.length})`,
    favorites: `Favorites (${favorites.length})`,
  };

  return (
    <AdminShell title="Activity" email={user.email}>
      <p className="mb-4 text-sm text-panel-fg/60">
        Orders, finance applications, test drives and favorites. See Reservations in the sidebar for
        checkout reservations.
      </p>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-control px-3.5 py-2 text-sm font-medium ring-1 transition-colors ${
              tab === t
                ? "bg-brass text-white ring-brass"
                : "bg-panel-2 text-panel-fg/60 ring-panel-fg/10 hover:text-panel-fg"
            }`}
          >
            {tabLabel[t]}
          </button>
        ))}
      </div>

      {tab === "orders" ? <OrdersTable rows={orders} onChange={refresh} /> : null}
      {tab === "finance" ? <FinanceTable rows={finance} onChange={refresh} /> : null}
      {tab === "testDrives" ? <TestDrivesTable rows={testDrives} onChange={refresh} /> : null}
      {tab === "favorites" ? <FavoritesTable rows={favorites} onChange={refresh} /> : null}
    </AdminShell>
  );
}

function StatusEditor({
  status,
  onSave,
}: {
  status: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [value, setValue] = useState(status);
  const [saving, setSaving] = useState(false);
  const dirty = value.trim() !== status && value.trim().length > 0;

  const save = async () => {
    setSaving(true);
    try {
      await onSave(value.trim());
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update status");
      setValue(status);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && dirty && save()}
        className="w-32 rounded-control bg-panel px-2 py-1 text-xs outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
      />
      {dirty ? (
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-control bg-brass px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
        >
          Save
        </button>
      ) : null}
    </div>
  );
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-8 text-center text-panel-fg/50">
        {label}
      </td>
    </tr>
  );
}

const tableWrap = "overflow-x-auto rounded-panel ring-1 ring-panel-fg/10";
const table = "w-full min-w-[760px] border-collapse text-sm";
const thead =
  "border-b border-panel-fg/10 text-left text-[11px] tracking-[0.1em] text-panel-fg/50 uppercase";
const rowCls = "border-b border-panel-fg/10 last:border-b-0";

function OrdersTable({ rows, onChange }: { rows: CustomerOrder[]; onChange: () => void }) {
  return (
    <div className={tableWrap}>
      <table className={table}>
        <thead>
          <tr className={thead}>
            <th className="p-3">Reference</th>
            <th className="p-3">Customer</th>
            <th className="p-3">Total</th>
            <th className="p-3">Delivery</th>
            <th className="p-3">Status</th>
            <th className="p-3">Placed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id} className={rowCls}>
              <td className="num p-3 font-medium">{o.order_reference}</td>
              <td className="p-3">
                <div>{o.full_name}</div>
                <div className="text-xs text-panel-fg/50">{o.phone}</div>
              </td>
              <td className="num p-3">{formatSar(o.total_amount)}</td>
              <td className="p-3 text-panel-fg/70 capitalize">{o.delivery_option}</td>
              <td className="p-3">
                <StatusEditor
                  status={o.status}
                  onSave={async (status) => {
                    await updateOrderStatusFn({ data: { id: o.id, status } });
                    onChange();
                  }}
                />
              </td>
              <td className="p-3 text-panel-fg/60">{new Date(o.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {rows.length === 0 ? <EmptyRow colSpan={6} label="No orders yet." /> : null}
        </tbody>
      </table>
    </div>
  );
}

function FinanceTable({ rows, onChange }: { rows: FinanceApplication[]; onChange: () => void }) {
  return (
    <div className={tableWrap}>
      <table className={table}>
        <thead>
          <tr className={thead}>
            <th className="p-3">Applicant</th>
            <th className="p-3">Employment</th>
            <th className="p-3">Monthly income</th>
            <th className="p-3">Documents</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={f.id} className={rowCls}>
              <td className="p-3">
                <div>{f.full_name}</div>
                <div className="text-xs text-panel-fg/50">{f.phone}</div>
              </td>
              <td className="p-3 text-panel-fg/70">
                {f.employment_status}
                {f.employer_name ? ` · ${f.employer_name}` : ""}
              </td>
              <td className="num p-3">
                {f.monthly_income != null ? formatSar(f.monthly_income) : "—"}
              </td>
              <td className="p-3 text-xs text-panel-fg/60">
                {f.national_id_uploaded ? "ID ✓" : "ID ✗"} ·{" "}
                {f.salary_certificate_uploaded ? "Salary ✓" : "Salary ✗"}
              </td>
              <td className="p-3">
                <StatusEditor
                  status={f.status}
                  onSave={async (status) => {
                    await updateFinanceApplicationStatusFn({ data: { id: f.id, status } });
                    onChange();
                  }}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 ? <EmptyRow colSpan={5} label="No finance applications yet." /> : null}
        </tbody>
      </table>
    </div>
  );
}

function TestDrivesTable({ rows, onChange }: { rows: TestDriveBooking[]; onChange: () => void }) {
  return (
    <div className={tableWrap}>
      <table className={table}>
        <thead>
          <tr className={thead}>
            <th className="p-3">Customer</th>
            <th className="p-3">Car</th>
            <th className="p-3">Branch</th>
            <th className="p-3">When</th>
            <th className="p-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className={rowCls}>
              <td className="p-3">
                <div>{b.profile?.full_name ?? "—"}</div>
                <div className="text-xs text-panel-fg/50">{b.profile?.phone ?? b.user_id}</div>
              </td>
              <td className="p-3 text-panel-fg/70">{b.car_id}</td>
              <td className="p-3 text-panel-fg/70">{b.branch}</td>
              <td className="p-3 text-panel-fg/70">
                {b.scheduled_date} · {b.scheduled_time}
              </td>
              <td className="p-3">
                <StatusEditor
                  status={b.status}
                  onSave={async (status) => {
                    await updateTestDriveBookingStatusFn({ data: { id: b.id, status } });
                    onChange();
                  }}
                />
              </td>
            </tr>
          ))}
          {rows.length === 0 ? <EmptyRow colSpan={5} label="No test drives booked yet." /> : null}
        </tbody>
      </table>
    </div>
  );
}

function FavoritesTable({ rows, onChange }: { rows: Favorite[]; onChange: () => void }) {
  return (
    <div className={tableWrap}>
      <table className={table}>
        <thead>
          <tr className={thead}>
            <th className="p-3">Customer</th>
            <th className="p-3">Car</th>
            <th className="p-3">Saved</th>
            <th className="p-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((f) => (
            <tr key={`${f.user_id}-${f.car_id}`} className={rowCls}>
              <td className="p-3">
                <div>{f.profile?.full_name ?? "—"}</div>
                <div className="text-xs text-panel-fg/50">{f.profile?.phone ?? f.user_id}</div>
              </td>
              <td className="p-3 text-panel-fg/70">{f.car_id}</td>
              <td className="p-3 text-panel-fg/60">{new Date(f.created_at).toLocaleString()}</td>
              <td className="p-3 text-right">
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={async () => {
                    if (!confirm("Remove this favorite?")) return;
                    await deleteFavoriteFn({ data: { user_id: f.user_id, car_id: f.car_id } });
                    onChange();
                  }}
                  className="grid size-8 place-items-center rounded-control text-panel-fg/60 ring-1 ring-panel-fg/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? <EmptyRow colSpan={4} label="No favorites yet." /> : null}
        </tbody>
      </table>
    </div>
  );
}
