import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { adminLogin, getAdminUser } from "@/lib/admin/auth";

export const Route = createFileRoute("/admin/login")({
  validateSearch: z.object({ error: z.string().optional() }),
  beforeLoad: async () => {
    const user = await getAdminUser();
    if (user) throw redirect({ to: "/admin" });
  },
  head: () => ({
    meta: [{ title: "Admin Login — Yalhacar" }],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(search.error ?? null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await adminLogin({ data: { email, password } });
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    navigate({ to: "/admin" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-panel px-4 text-panel-fg">
      <div className="w-full max-w-sm rounded-panel bg-panel-2 p-6 ring-1 ring-panel-fg/10 sm:p-8">
        <div className="mb-1 text-[11px] tracking-[0.2em] text-panel-accent uppercase">
          Yalhacar
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Admin Login</h1>
        <p className="mt-1 text-sm text-mist">Sign in to manage the vehicle inventory.</p>

        {error ? (
          <div className="mt-4 rounded-control bg-destructive/15 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="mt-6">
          <label className="block">
            <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-panel-fg/55 uppercase">
              Email
            </span>
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-control bg-panel px-3 py-2.5 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] tracking-[0.1em] text-panel-fg/55 uppercase">
              Password
            </span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-control bg-panel px-3 py-2.5 text-sm outline-none ring-1 ring-panel-fg/10 focus:ring-brass"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-control bg-brass px-4 py-3 text-center font-display text-sm font-medium text-white transition-colors hover:bg-brass-2 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
