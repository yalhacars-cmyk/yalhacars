import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { exchangePublicOAuthCode } from "@/lib/auth";

export const Route = createFileRoute("/auth/callback")({
  validateSearch: z.object({
    code: z.string().optional(),
    error_description: z.string().optional(),
    next: z.string().optional(),
  }),
  beforeLoad: async ({ search }) => {
    const next = search.next && search.next.startsWith("/") ? search.next : "/";
    if (search.error_description) {
      throw redirect({ href: `/?authError=${encodeURIComponent(search.error_description)}` });
    }
    if (!search.code) {
      throw redirect({ href: "/?authError=Missing%20OAuth%20code" });
    }
    const { error } = await exchangePublicOAuthCode({ data: { code: search.code } });
    if (error) {
      throw redirect({ href: `/?authError=${encodeURIComponent(error)}` });
    }
    throw redirect({ href: next });
  },
  component: () => null,
});
