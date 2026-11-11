import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { BadgeCheck, Eye, EyeOff, FileText, Pencil, Store } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ViewToggle } from "@/components/admin/ViewToggle";
import { useViewMode } from "@/hooks/use-view-mode";
import { getAdminUser } from "@/lib/admin/auth";
import {
  listCustomersFn,
  type Profile,
  setDealerStoreStatusFn,
  setDealerVerifiedFn,
  updateCustomerFn,
} from "@/lib/admin/customers";

export const Route = createFileRoute("/admin/customers")({
  beforeLoad: async () => {
    const user = await getAdminUser();
    if (!user) throw redirect({ to: "/admin/login" });
    return { user };
  },
  loader: () => listCustomersFn(),
  head: () => ({ meta: [{ title: "Customers — Yalhacar Admin" }] }),
  component: AdminCustomers,
});

const ACCOUNT_FILTERS = ["all", "individual", "dealer"] as const;
type AccountFilter = (typeof ACCOUNT_FILTERS)[number];

function maskId(id: string) {
  if (id.length <= 4) return "••••";
  return `${"•".repeat(id.length - 4)}${id.slice(-4)}`;
}

function AdminCustomers() {
  const customers = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [editing, setEditing] = useState<Profile | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useViewMode("customers", "list");

  const dealerCount = customers.filter((c) => c.account_type === "dealer").length;
  const pendingDealerCount = customers.filter(
    (c) => c.account_type === "dealer" && !c.dealer_verified,
  ).length;

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      customers
        .filter((c) => accountFilter === "all" || c.account_type === accountFilter)
        .filter(
          (c) =>
            c.full_name.toLowerCase().includes(q) ||
            (c.email ?? "").toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            (c.business_name ?? "").toLowerCase().includes(q),
        ),
    [customers, accountFilter, q],
  );

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <AdminShell title="Customers" email={user.email}>
      <p className="mb-4 text-sm text-panel-fg/60">
        Every account that has ever signed in — not just ones with a completed profile. National ID
        is masked by default — this is real PII.
        {pendingDealerCount > 0
          ? ` ${pendingDealerCount} dealer${pendingDealerCount === 1 ? "" : "s"} awaiting verification.`
          : ""}
      </p>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, email, phone, city, business…"
            className="w-64 rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 placeholder:text-panel-fg/40"
          />
          <div className="flex gap-1.5">
            {ACCOUNT_FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setAccountFilter(f)}
                className={`rounded-control px-3 py-2 text-sm font-medium capitalize ring-1 transition-colors ${
                  accountFilter === f
                    ? "bg-brass text-white ring-brass"
                    : "bg-panel-2 text-panel-fg/60 ring-panel-fg/10 hover:text-panel-fg"
                }`}
              >
                {f === "all"
                  ? `All (${customers.length})`
                  : `${f} (${f === "dealer" ? dealerCount : customers.length - dealerCount})`}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-panel-fg/40">{filtered.length} shown</span>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {viewMode === "grid" ? (
        filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => (
              <div
                key={c.user_id}
                className="flex flex-col rounded-panel bg-panel-2 p-4 ring-1 ring-panel-fg/10"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{c.full_name}</div>
                    {c.email && c.email !== c.full_name ? (
                      <div className="truncate text-xs text-panel-fg/45">{c.email}</div>
                    ) : null}
                    {c.business_name ? (
                      <div className="truncate text-xs text-panel-fg/45">{c.business_name}</div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    aria-label="Edit"
                    className="grid size-8 shrink-0 place-items-center rounded-control text-panel-fg/60 ring-1 ring-panel-fg/10 hover:text-panel-fg"
                  >
                    <Pencil className="size-4" />
                  </button>
                </div>

                <div className="mt-2">
                  {!c.has_profile ? (
                    <span className="rounded-full bg-panel-fg/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-panel-fg/40">
                      No profile yet
                    </span>
                  ) : c.account_type === "dealer" ? (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                        c.dealer_verified
                          ? "bg-brass/20 text-brass-2"
                          : "bg-panel-fg/10 text-panel-fg/50"
                      }`}
                    >
                      {c.dealer_verified ? <BadgeCheck className="size-3" /> : null}
                      {c.dealer_verified ? "Verified dealer" : "Dealer · pending"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-panel-fg/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-panel-fg/50">
                      Individual
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-sm text-panel-fg/70">
                  <div dir="ltr" className="num">
                    {c.phone}
                  </div>
                  <div>{c.city}</div>
                  <button
                    type="button"
                    onClick={() => toggleReveal(c.user_id)}
                    className="num inline-flex items-center gap-1.5 text-panel-fg/70 hover:text-panel-fg"
                  >
                    {revealed.has(c.user_id) ? (
                      <>
                        <EyeOff className="size-3.5" /> {c.national_id}
                      </>
                    ) : (
                      <>
                        <Eye className="size-3.5" /> {maskId(c.national_id)}
                      </>
                    )}
                  </button>
                </div>

                {c.dealer_store ? (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-panel-fg/10 pt-3 text-xs text-panel-fg/50">
                    <Store className="size-3.5 shrink-0" />
                    <span className="truncate">{c.dealer_store.store_name}</span>
                    <span
                      className={`ml-auto shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
                        c.dealer_store.status === "approved"
                          ? "bg-brass/20 text-brass-2"
                          : c.dealer_store.status === "rejected"
                            ? "bg-destructive/20 text-destructive"
                            : "bg-panel-fg/10 text-panel-fg/50"
                      }`}
                    >
                      {c.dealer_store.status}
                    </span>
                  </div>
                ) : null}

                <div className="mt-3 border-t border-panel-fg/10 pt-2 text-xs text-panel-fg/40">
                  Joined {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-panel p-8 text-center text-panel-fg/50 ring-1 ring-panel-fg/10">
            No customers match.
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-panel ring-1 ring-panel-fg/10">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-panel-fg/10 text-left text-[11px] tracking-[0.1em] text-panel-fg/50 uppercase">
                <th className="p-3">Name</th>
                <th className="p-3">Account</th>
                <th className="p-3">Phone</th>
                <th className="p-3">City</th>
                <th className="p-3">National ID</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.user_id} className="border-b border-panel-fg/10 last:border-b-0">
                  <td className="p-3">
                    <div className="font-medium">{c.full_name}</div>
                    {c.email && c.email !== c.full_name ? (
                      <div className="text-xs text-panel-fg/45">{c.email}</div>
                    ) : null}
                    {c.business_name ? (
                      <div className="text-xs text-panel-fg/45">{c.business_name}</div>
                    ) : null}
                  </td>
                  <td className="p-3">
                    {!c.has_profile ? (
                      <span className="rounded-full bg-panel-fg/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-panel-fg/40">
                        No profile yet
                      </span>
                    ) : c.account_type === "dealer" ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                          c.dealer_verified
                            ? "bg-brass/20 text-brass-2"
                            : "bg-panel-fg/10 text-panel-fg/50"
                        }`}
                      >
                        {c.dealer_verified ? <BadgeCheck className="size-3" /> : null}
                        {c.dealer_verified ? "Verified dealer" : "Dealer · pending"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-panel-fg/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-panel-fg/50">
                        Individual
                      </span>
                    )}
                  </td>
                  <td className="num p-3 text-panel-fg/70">{c.phone}</td>
                  <td className="p-3 text-panel-fg/70">{c.city}</td>
                  <td className="num p-3">
                    <button
                      type="button"
                      onClick={() => toggleReveal(c.user_id)}
                      className="inline-flex items-center gap-1.5 text-panel-fg/70 hover:text-panel-fg"
                    >
                      {revealed.has(c.user_id) ? (
                        <>
                          <EyeOff className="size-3.5" /> {c.national_id}
                        </>
                      ) : (
                        <>
                          <Eye className="size-3.5" /> {maskId(c.national_id)}
                        </>
                      )}
                    </button>
                  </td>
                  <td className="p-3 text-panel-fg/60">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      aria-label="Edit"
                      className="grid size-8 place-items-center rounded-control text-panel-fg/60 ring-1 ring-panel-fg/10 hover:text-panel-fg"
                    >
                      <Pencil className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-panel-fg/50">
                    No customers match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <EditCustomerDialog
          customer={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.invalidate();
          }}
        />
      ) : null}
    </AdminShell>
  );
}

function DocLink({ label, url }: { label: string; url: string | null | undefined }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-control bg-panel px-3 py-2 text-xs font-medium text-panel-fg/80 ring-1 ring-panel-fg/10 hover:text-panel-fg"
    >
      <FileText className="size-3.5" /> {label}
    </a>
  );
}

function EditCustomerDialog({
  customer,
  onClose,
  onSaved,
}: {
  customer: Profile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(customer.full_name);
  const [phone, setPhone] = useState(customer.phone);
  const [city, setCity] = useState(customer.city);
  const [nationalId, setNationalId] = useState(customer.national_id);
  const [businessName, setBusinessName] = useState(customer.business_name ?? "");
  const [crNumber, setCrNumber] = useState(customer.cr_number ?? "");
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [dealerVerified, setDealerVerified] = useState(customer.dealer_verified);
  const [storeStatus, setStoreStatus] = useState(customer.dealer_store?.status ?? null);
  const [storeStatusSaving, setStoreStatusSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateCustomerFn({
        data: {
          user_id: customer.user_id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          national_id: nationalId.trim(),
          ...(customer.account_type === "dealer"
            ? { business_name: businessName.trim() || null, cr_number: crNumber.trim() || null }
            : {}),
        },
      });
      onSaved();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  };

  const toggleVerified = async () => {
    setVerifying(true);
    try {
      await setDealerVerifiedFn({ data: { user_id: customer.user_id, verified: !dealerVerified } });
      setDealerVerified((v) => !v);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update verification");
    } finally {
      setVerifying(false);
    }
  };

  const setStoreStatusTo = async (status: "approved" | "rejected") => {
    setStoreStatusSaving(true);
    try {
      await setDealerStoreStatusFn({ data: { user_id: customer.user_id, status } });
      setStoreStatus(status);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update store status");
    } finally {
      setStoreStatusSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-panel bg-panel p-5 ring-1 ring-panel-fg/10">
        <h2 className="font-display text-base font-semibold">Edit customer</h2>
        {!customer.has_profile ? (
          <p className="mt-1 text-xs text-panel-fg/50">
            This account signed in but never completed its profile — fields below are empty
            placeholders. Saving here creates their profile for them.
          </p>
        ) : null}
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="mb-1.5 block text-panel-fg/70">Full name</span>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-panel-fg/70">Phone</span>
            <input
              dir="ltr"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-panel-fg/70">City</span>
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-panel-fg/70">National ID</span>
            <input
              dir="ltr"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
            />
          </label>
          <DocLink label="View National ID document" url={customer.national_id_document_url} />
        </div>

        {customer.account_type === "dealer" ? (
          <div className="mt-5 space-y-3 border-t border-panel-fg/10 pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Dealer details</h3>
              <button
                type="button"
                disabled={verifying}
                onClick={toggleVerified}
                className={`inline-flex items-center gap-1.5 rounded-control px-3 py-1.5 text-xs font-medium disabled:opacity-50 ${
                  dealerVerified
                    ? "bg-panel-fg/10 text-panel-fg/70 hover:text-panel-fg"
                    : "bg-brass text-white hover:bg-brass-2"
                }`}
              >
                <BadgeCheck className="size-3.5" />
                {verifying ? "Saving…" : dealerVerified ? "Revoke verification" : "Verify dealer"}
              </button>
            </div>

            <label className="block text-sm">
              <span className="mb-1.5 block text-panel-fg/70">Business name</span>
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block text-panel-fg/70">CR number</span>
              <input
                dir="ltr"
                value={crNumber}
                onChange={(e) => setCrNumber(e.target.value)}
                className="w-full rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
              />
            </label>
            <DocLink label="View CR document" url={customer.cr_document_url} />
            {!customer.cr_document_url && !customer.cr_document_path ? (
              <p className="text-xs text-panel-fg/40">No CR document uploaded yet.</p>
            ) : null}

            {customer.dealer_store ? (
              <div className="rounded-control bg-panel-2 p-2.5 ring-1 ring-panel-fg/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {customer.dealer_store.logo_url ? (
                      <img
                        src={customer.dealer_store.logo_url}
                        alt=""
                        className="size-8 shrink-0 rounded-control object-contain ring-1 ring-panel-fg/10"
                      />
                    ) : null}
                    <div className="text-sm">
                      <div className="text-[10px] tracking-[0.1em] text-panel-fg/40 uppercase">
                        Store
                      </div>
                      <div className="font-medium">{customer.dealer_store.store_name}</div>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                      storeStatus === "approved"
                        ? "bg-brass/20 text-brass-2"
                        : storeStatus === "rejected"
                          ? "bg-destructive/20 text-destructive"
                          : "bg-panel-fg/10 text-panel-fg/50"
                    }`}
                  >
                    {storeStatus}
                  </span>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button
                    type="button"
                    disabled={storeStatusSaving || storeStatus === "approved"}
                    onClick={() => setStoreStatusTo("approved")}
                    className="flex-1 rounded-control bg-brass px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Approve store
                  </button>
                  <button
                    type="button"
                    disabled={storeStatusSaving || storeStatus === "rejected"}
                    onClick={() => setStoreStatusTo("rejected")}
                    className="flex-1 rounded-control bg-panel-fg/10 px-3 py-1.5 text-xs font-medium text-panel-fg/70 hover:text-panel-fg disabled:opacity-50"
                  >
                    Reject store
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-panel-fg/40">No dealer store set up yet.</p>
            )}
            <p className="text-xs text-panel-fg/50">
              This store name/logo get stamped onto every listing this dealer submits once approved.
            </p>
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-3.5 py-2 text-sm font-medium text-panel-fg/70 ring-1 ring-panel-fg/10 hover:text-panel-fg"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="rounded-control bg-brass px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
