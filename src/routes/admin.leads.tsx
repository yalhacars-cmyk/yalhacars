import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Phone } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { ViewToggle } from "@/components/admin/ViewToggle";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useViewMode } from "@/hooks/use-view-mode";
import { getAdminUser } from "@/lib/admin/auth";
import { listLeadsFn, updateLeadStatusFn } from "@/lib/admin/leads";

export const Route = createFileRoute("/admin/leads")({
  beforeLoad: async () => {
    const user = await getAdminUser();
    if (!user) throw redirect({ to: "/admin/login" });
    return { user };
  },
  loader: () => listLeadsFn(),
  head: () => ({ meta: [{ title: "Leads — Yalhacar Admin" }] }),
  component: AdminLeads,
});

type Lead = Awaited<ReturnType<typeof listLeadsFn>>[number];

const TYPES = [
  "all",
  "test_drive",
  "seller_submission",
  "dealer_contact",
  "b2b_contact",
  "finance_application",
  "support_ticket",
  "general_contact",
] as const;

const statusTone: Record<string, string> = {
  new: "bg-brass/20 text-brass-2",
  contacted: "bg-panel-fg/10 text-panel-fg/70",
  closed: "bg-destructive/20 text-destructive",
};

function AdminLeads() {
  const leads = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<(typeof TYPES)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | Lead["status"]>("all");
  const [active, setActive] = useState<Lead | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useViewMode("leads", "list");

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) =>
          (typeFilter === "all" || l.type === typeFilter) &&
          (statusFilter === "all" || l.status === statusFilter),
      ),
    [leads, typeFilter, statusFilter],
  );

  const setStatus = async (lead: Lead, status: Lead["status"]) => {
    setSaving(true);
    try {
      await updateLeadStatusFn({ data: { id: lead.id, status } });
      setActive((prev: Lead | null) => (prev && prev.id === lead.id ? { ...prev, status } : prev));
      await router.invalidate();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Leads" email={user.email}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as (typeof TYPES)[number])}
            className="rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "all" ? "All types" : t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10"
          >
            <option value="all">All statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-panel-fg/40">{filtered.length} leads</span>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {viewMode === "grid" ? (
        filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((lead) => (
              <button
                key={lead.id}
                type="button"
                onClick={() => setActive(lead)}
                className="flex flex-col rounded-panel bg-panel-2 p-4 text-left ring-1 ring-panel-fg/10 transition-colors hover:ring-panel-fg/25"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="rounded-full bg-panel-fg/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-panel-fg/60 capitalize">
                    {lead.type.replace(/_/g, " ")}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${statusTone[lead.status]}`}
                  >
                    {lead.status}
                  </span>
                </div>
                <div className="mt-3 truncate font-medium">{lead.name}</div>
                <div dir="ltr" className="num mt-1 text-sm text-panel-fg/70">
                  {lead.phone}
                </div>
                <div className="mt-3 border-t border-panel-fg/10 pt-2 text-xs text-panel-fg/40">
                  {new Date(lead.created_at).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-panel p-8 text-center text-panel-fg/50 ring-1 ring-panel-fg/10">
            No leads match.
          </div>
        )
      ) : (
        <div className="overflow-x-auto rounded-panel ring-1 ring-panel-fg/10">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-panel-fg/10 text-left text-[11px] tracking-[0.1em] text-panel-fg/50 uppercase">
                <th className="p-3">Type</th>
                <th className="p-3">Name</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Received</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr
                  key={lead.id}
                  onClick={() => setActive(lead)}
                  className="cursor-pointer border-b border-panel-fg/10 last:border-b-0 hover:bg-panel-2"
                >
                  <td className="p-3 capitalize">{lead.type.replace(/_/g, " ")}</td>
                  <td className="p-3 font-medium">{lead.name}</td>
                  <td className="num p-3 text-panel-fg/70" dir="ltr">
                    {lead.phone}
                  </td>
                  <td className="p-3 text-panel-fg/60">
                    {new Date(lead.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${statusTone[lead.status]}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-panel-fg/50">
                    No leads match.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={active !== null} onOpenChange={(open) => !open && setActive(null)}>
        <SheetContent className="w-full overflow-y-auto bg-panel text-panel-fg sm:max-w-md">
          {active ? (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="text-panel-fg capitalize">
                  {active.type.replace(/_/g, " ")}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="rounded-control bg-panel-2 p-3 text-sm ring-1 ring-panel-fg/10">
                  <div className="font-medium">{active.name}</div>
                  <a
                    href={`tel:${active.phone}`}
                    dir="ltr"
                    className="mt-1 flex items-center gap-1.5 text-panel-fg/70 hover:text-panel-accent"
                  >
                    <Phone className="size-3.5" /> {active.phone}
                  </a>
                  {active.email ? (
                    <div className="mt-0.5 text-panel-fg/50">{active.email}</div>
                  ) : null}
                  {active.city ? (
                    <div className="mt-0.5 text-panel-fg/50">{active.city}</div>
                  ) : null}
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] tracking-[0.1em] text-panel-fg/50 uppercase">
                    Details
                  </div>
                  <div className="space-y-1.5 rounded-control bg-panel-2 p-3 text-sm ring-1 ring-panel-fg/10">
                    {Object.entries(active.payload as Record<string, unknown>).length === 0 ? (
                      <p className="text-panel-fg/40">No additional details.</p>
                    ) : (
                      Object.entries(active.payload as Record<string, unknown>).map(
                        ([key, value]) => (
                          <div key={key} className="flex items-start justify-between gap-3">
                            <span className="shrink-0 capitalize text-panel-fg/50">
                              {key.replace(/([A-Z])/g, " $1")}
                            </span>
                            <span className="text-right font-medium break-words">
                              {typeof value === "object" ? JSON.stringify(value) : String(value)}
                            </span>
                          </div>
                        ),
                      )
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] tracking-[0.1em] text-panel-fg/50 uppercase">
                    Status
                  </div>
                  <div className="flex gap-2">
                    {(["new", "contacted", "closed"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        disabled={saving}
                        onClick={() => setStatus(active, s)}
                        className={`flex-1 rounded-control px-3 py-2 text-xs font-medium capitalize ring-1 transition-colors disabled:opacity-50 ${
                          active.status === s
                            ? "bg-brass text-white ring-brass"
                            : "bg-panel-2 text-panel-fg/70 ring-panel-fg/10 hover:text-panel-fg"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </AdminShell>
  );
}
