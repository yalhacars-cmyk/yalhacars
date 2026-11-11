import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { BulkImagePicker, ImagePicker, useNextSortOrder } from "@/components/admin/ImagePicker";
import { getAdminUser } from "@/lib/admin/auth";
import {
  type BodyType,
  type CarMake,
  type CarModel,
  createBodyTypeFn,
  createCarMakeFn,
  createCarModelFn,
  createVehicleOptionFn,
  deleteBodyTypeFn,
  deleteCarMakeFn,
  deleteCarModelFn,
  deleteVehicleOptionFn,
  getVehicleYearRangeFn,
  listBodyTypesFn,
  listCarMakesFn,
  listCarModelsFn,
  listVehicleOptionsFn,
  updateBodyTypeFn,
  updateCarMakeFn,
  updateCarModelFn,
  updateVehicleOptionFn,
  updateVehicleYearRangeFn,
  type VehicleOption,
} from "@/lib/admin/catalog";

export const Route = createFileRoute("/admin/catalog")({
  beforeLoad: async () => {
    const user = await getAdminUser();
    if (!user) throw redirect({ to: "/admin/login" });
    return { user };
  },
  loader: async () => {
    const [makes, models, options, yearRange, bodyTypes] = await Promise.all([
      listCarMakesFn(),
      listCarModelsFn(),
      listVehicleOptionsFn(),
      getVehicleYearRangeFn(),
      listBodyTypesFn(),
    ]);
    return { makes, models, options, yearRange, bodyTypes };
  },
  head: () => ({ meta: [{ title: "Catalog — Yalhacar Admin" }] }),
  component: AdminCatalog,
});

const TABS = ["makes", "models", "options", "bodyTypes", "years"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  makes: "Makes",
  models: "Models",
  options: "Options",
  bodyTypes: "Body types",
  years: "Year range",
};

function AdminCatalog() {
  const { makes, models, options, yearRange, bodyTypes } = Route.useLoaderData();
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("makes");
  const refresh = () => router.invalidate();

  return (
    <AdminShell title="Catalog" email={user.email}>
      <p className="mb-4 text-sm text-panel-fg/60">
        Dropdown data the car-submission form reads from.
      </p>
      <div className="mb-5 flex gap-1.5">
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
            {TAB_LABEL[t]}
          </button>
        ))}
      </div>

      {tab === "makes" ? <MakesSection rows={makes} onChange={refresh} /> : null}
      {tab === "models" ? <ModelsSection rows={models} onChange={refresh} /> : null}
      {tab === "options" ? <OptionsSection rows={options} onChange={refresh} /> : null}
      {tab === "bodyTypes" ? <BodyTypesSection rows={bodyTypes} onChange={refresh} /> : null}
      {tab === "years" ? <YearRangeSection row={yearRange} onChange={refresh} /> : null}
    </AdminShell>
  );
}

function SectionShell({
  query,
  onQuery,
  children,
}: {
  query: string;
  onQuery: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-panel bg-panel-2 ring-1 ring-panel-fg/10">
      <div className="border-b border-panel-fg/10 p-3">
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search…"
          className="w-56 rounded-control bg-panel px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10 placeholder:text-panel-fg/40"
        />
      </div>
      <div className="max-h-[520px] overflow-y-auto">{children}</div>
    </div>
  );
}

/** Click-to-rename text — every catalog value here is meant to be fully editable, not just add/hide/delete. */
function InlineEditText({
  value,
  onSave,
  inactive,
  className,
}: {
  value: string;
  onSave: (next: string) => Promise<void>;
  inactive?: boolean;
  className?: string;
}) {
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  useEffect(() => setText(value), [value]);

  const commit = async () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === value) {
      setText(value);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
      setText(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <input
      value={text}
      disabled={saving}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setText(value);
      }}
      className={`rounded-control bg-transparent px-1.5 py-1 outline-none hover:bg-panel focus:bg-panel focus:ring-1 focus:ring-brass disabled:opacity-50 ${
        inactive ? "text-panel-fg/40 line-through" : ""
      } ${className ?? ""}`}
    />
  );
}

function MakesSection({ rows, onChange }: { rows: CarMake[]; onChange: () => void }) {
  const [query, setQuery] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(
    () => rows.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase())),
    [rows, query],
  );

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createCarMakeFn({ data: { name: name.trim(), sort_order: rows.length } });
      setName("");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add make");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="New make, e.g. Toyota"
          className="w-64 rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10"
        />
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-control bg-brass px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus className="size-4" /> Add
        </button>
      </div>

      <SectionShell query={query} onQuery={setQuery}>
        {filtered.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 border-b border-panel-fg/10 px-3 py-2.5 text-sm last:border-b-0"
          >
            <InlineEditText
              value={row.name}
              inactive={!row.is_active}
              className="w-56"
              onSave={async (name) => {
                await updateCarMakeFn({ data: { id: row.id, name } });
                onChange();
              }}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await updateCarMakeFn({ data: { id: row.id, is_active: !row.is_active } });
                  onChange();
                }}
                className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                  row.is_active ? "bg-brass/20 text-brass-2" : "bg-panel-fg/10 text-panel-fg/50"
                }`}
              >
                {row.is_active ? "active" : "hidden"}
              </button>
              <button
                type="button"
                aria-label="Delete"
                onClick={async () => {
                  if (!confirm(`Delete "${row.name}"?`)) return;
                  await deleteCarMakeFn({ data: { id: row.id } });
                  onChange();
                }}
                className="grid size-7 place-items-center rounded-control text-panel-fg/50 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-panel-fg/50">No makes match.</p>
        ) : null}
      </SectionShell>
    </div>
  );
}

function ModelsSection({ rows, onChange }: { rows: CarModel[]; onChange: () => void }) {
  const [query, setQuery] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () => rows.filter((r) => r.make.toLowerCase().includes(q) || r.model.toLowerCase().includes(q)),
    [rows, q],
  );

  const add = async () => {
    if (!make.trim() || !model.trim()) return;
    setBusy(true);
    try {
      await createCarModelFn({ data: { make: make.trim(), model: model.trim(), sort_order: 0 } });
      setModel("");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add model");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={make}
          onChange={(e) => setMake(e.target.value)}
          placeholder="Make, e.g. Toyota"
          className="w-44 rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10"
        />
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Model, e.g. Camry"
          className="w-44 rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10"
        />
        <button
          type="button"
          disabled={busy || !make.trim() || !model.trim()}
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-control bg-brass px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus className="size-4" /> Add
        </button>
      </div>

      <SectionShell query={query} onQuery={setQuery}>
        {filtered.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 border-b border-panel-fg/10 px-3 py-2.5 text-sm last:border-b-0"
          >
            <div className="flex items-center gap-1">
              <InlineEditText
                value={row.make}
                inactive={!row.is_active}
                className="w-32 text-panel-fg/60"
                onSave={async (make) => {
                  await updateCarModelFn({ data: { id: row.id, make } });
                  onChange();
                }}
              />
              <InlineEditText
                value={row.model}
                inactive={!row.is_active}
                className="w-40"
                onSave={async (model) => {
                  await updateCarModelFn({ data: { id: row.id, model } });
                  onChange();
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await updateCarModelFn({ data: { id: row.id, is_active: !row.is_active } });
                  onChange();
                }}
                className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                  row.is_active ? "bg-brass/20 text-brass-2" : "bg-panel-fg/10 text-panel-fg/50"
                }`}
              >
                {row.is_active ? "active" : "hidden"}
              </button>
              <button
                type="button"
                aria-label="Delete"
                onClick={async () => {
                  if (!confirm(`Delete "${row.make} ${row.model}"?`)) return;
                  await deleteCarModelFn({ data: { id: row.id } });
                  onChange();
                }}
                className="grid size-7 place-items-center rounded-control text-panel-fg/50 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-panel-fg/50">No models match.</p>
        ) : null}
      </SectionShell>
    </div>
  );
}

function OptionsSection({ rows, onChange }: { rows: VehicleOption[]; onChange: () => void }) {
  const [query, setQuery] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const existingKeys = useMemo(() => [...new Set(rows.map((r) => r.field_key))].sort(), [rows]);
  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      rows.filter(
        (r) => r.field_key.toLowerCase().includes(q) || r.value.toLowerCase().includes(q),
      ),
    [rows, q],
  );

  const add = async () => {
    if (!fieldKey.trim() || !value.trim()) return;
    setBusy(true);
    try {
      await createVehicleOptionFn({
        data: { field_key: fieldKey.trim(), value: value.trim(), sort_order: 0 },
      });
      setValue("");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add option");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          value={fieldKey}
          onChange={(e) => setFieldKey(e.target.value)}
          placeholder="Field, e.g. fuel_type"
          list="option-field-keys"
          className="w-44 rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10"
        />
        <datalist id="option-field-keys">
          {existingKeys.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Value, e.g. Diesel"
          className="w-44 rounded-control bg-panel-2 px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10"
        />
        <button
          type="button"
          disabled={busy || !fieldKey.trim() || !value.trim()}
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-control bg-brass px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <Plus className="size-4" /> Add
        </button>
      </div>

      <SectionShell query={query} onQuery={setQuery}>
        {filtered.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 border-b border-panel-fg/10 px-3 py-2.5 text-sm last:border-b-0"
          >
            <div className="flex items-center gap-1">
              <InlineEditText
                value={row.field_key}
                inactive={!row.is_active}
                className="w-32 text-panel-fg/60"
                onSave={async (field_key) => {
                  await updateVehicleOptionFn({ data: { id: row.id, field_key } });
                  onChange();
                }}
              />
              <InlineEditText
                value={row.value}
                inactive={!row.is_active}
                className="w-40"
                onSave={async (value) => {
                  await updateVehicleOptionFn({ data: { id: row.id, value } });
                  onChange();
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  await updateVehicleOptionFn({ data: { id: row.id, is_active: !row.is_active } });
                  onChange();
                }}
                className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                  row.is_active ? "bg-brass/20 text-brass-2" : "bg-panel-fg/10 text-panel-fg/50"
                }`}
              >
                {row.is_active ? "active" : "hidden"}
              </button>
              <button
                type="button"
                aria-label="Delete"
                onClick={async () => {
                  if (!confirm(`Delete "${row.value}"?`)) return;
                  await deleteVehicleOptionFn({ data: { id: row.id } });
                  onChange();
                }}
                className="grid size-7 place-items-center rounded-control text-panel-fg/50 hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-panel-fg/50">No options match.</p>
        ) : null}
      </SectionShell>
    </div>
  );
}

function BodyTypesSection({ rows, onChange }: { rows: BodyType[]; onChange: () => void }) {
  const nextSortOrder = useNextSortOrder(rows.length);

  return (
    <div className="space-y-4">
      <div className="rounded-panel bg-panel-2 p-4 ring-1 ring-panel-fg/10">
        <div className="mb-2 text-xs font-medium tracking-[0.1em] text-panel-fg/50 uppercase">
          Add body types
        </div>
        <p className="mb-3 text-xs text-panel-fg/50">
          Select one or many images to add them — no label required, add one later if you want.
        </p>
        <BulkImagePicker
          bucket="app-content"
          onUploaded={async (image_url) => {
            await createBodyTypeFn({ data: { value: "", image_url, sort_order: nextSortOrder() } });
            onChange();
          }}
        />
      </div>

      {rows.length === 0 ? (
        <p className="rounded-panel bg-panel-2 p-8 text-center text-sm text-panel-fg/50 ring-1 ring-panel-fg/10">
          No body types yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map((row) => (
            <div
              key={row.id}
              className="space-y-2 rounded-panel bg-panel-2 p-3 ring-1 ring-panel-fg/10"
            >
              <ImagePicker
                bucket="app-content"
                imageUrl={row.image_url}
                onUploaded={async (image_url) => {
                  await updateBodyTypeFn({ data: { id: row.id, image_url } });
                  onChange();
                }}
              />
              <input
                defaultValue={row.value}
                placeholder="Label (optional)"
                onBlur={async (e) => {
                  const value = e.target.value.trim();
                  if (value !== row.value) {
                    await updateBodyTypeFn({ data: { id: row.id, value } });
                    onChange();
                  }
                }}
                className="w-full rounded-control bg-panel px-2 py-1.5 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={async () => {
                    await updateBodyTypeFn({ data: { id: row.id, is_active: !row.is_active } });
                    onChange();
                  }}
                  className={`rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-wide ${
                    row.is_active ? "bg-brass/20 text-brass-2" : "bg-panel-fg/10 text-panel-fg/50"
                  }`}
                >
                  {row.is_active ? "active" : "hidden"}
                </button>
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!confirm(`Delete "${row.value || "this body type"}"?`)) return;
                    await deleteBodyTypeFn({ data: { id: row.id } });
                    onChange();
                  }}
                  className="grid size-7 place-items-center rounded-control text-panel-fg/50 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function YearRangeSection({
  row,
  onChange,
}: {
  row: { id: string; min_year: number; max_year: number } | null;
  onChange: () => void;
}) {
  const [minYear, setMinYear] = useState(row?.min_year ?? new Date().getFullYear() - 20);
  const [maxYear, setMaxYear] = useState(row?.max_year ?? new Date().getFullYear() + 1);
  const [saving, setSaving] = useState(false);

  if (!row) {
    return (
      <p className="rounded-panel bg-panel-2 p-5 text-sm text-panel-fg/60 ring-1 ring-panel-fg/10">
        No year range row exists yet — nothing to edit here.
      </p>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      await updateVehicleYearRangeFn({
        data: { id: row.id, min_year: minYear, max_year: maxYear },
      });
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save year range");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-sm rounded-panel bg-panel-2 p-5 ring-1 ring-panel-fg/10">
      <p className="mb-4 text-sm text-panel-fg/60">
        The min/max model year the submission form allows.
      </p>
      <div className="flex items-center gap-3">
        <label className="block text-sm">
          <span className="mb-1.5 block text-panel-fg/70">Min year</span>
          <input
            type="number"
            value={minYear}
            onChange={(e) => setMinYear(Number(e.target.value))}
            className="w-28 rounded-control bg-panel px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block text-panel-fg/70">Max year</span>
          <input
            type="number"
            value={maxYear}
            onChange={(e) => setMaxYear(Number(e.target.value))}
            className="w-28 rounded-control bg-panel px-3 py-2 text-sm outline-none ring-1 ring-panel-fg/10"
          />
        </label>
      </div>
      <button
        type="button"
        disabled={saving || (minYear === row.min_year && maxYear === row.max_year)}
        onClick={save}
        className="mt-4 rounded-control bg-brass px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
