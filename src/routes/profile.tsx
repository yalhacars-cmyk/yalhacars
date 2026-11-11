import { createFileRoute, useRouter } from "@tanstack/react-router";
import { SignInPrompt } from "@/components/site/AuthControls";
import { DealerStoreForm } from "@/components/site/DealerStoreForm";
import { ProfileForm } from "@/components/site/ProfileForm";
import { getCurrentUserFn } from "@/lib/auth";
import { getMyDealerStoreFn } from "@/lib/dealerStore";
import { getMyProfileFn } from "@/lib/profile";

export const Route = createFileRoute("/profile")({
  loader: async () => {
    const [user, profile, dealerStore] = await Promise.all([
      getCurrentUserFn(),
      getMyProfileFn(),
      getMyDealerStoreFn(),
    ]);
    return { user, profile, dealerStore };
  },
  head: () => ({
    meta: [
      { title: "My Profile — Yalhacar" },
      { name: "description", content: "View and edit your Yalhacar profile and dealer store." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, dealerStore } = Route.useLoaderData();
  const router = useRouter();
  const refresh = () => router.invalidate();

  return (
    <div className="bg-paper">
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-6">
          <div className="mb-2 text-[11px] tracking-[0.2em] text-brass uppercase">Your account</div>
          <h1 className="text-balance font-display text-3xl font-semibold tracking-tight">
            My profile
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The details used every time you list a car — update them anytime.
          </p>
        </div>

        {!user ? (
          <SignInPrompt next="/profile" message="Sign in to view or edit your profile." />
        ) : (
          <div className="space-y-6">
            <ProfileForm user={user} profile={profile} onSaved={refresh} />
            {profile?.account_type === "dealer" ? (
              <DealerStoreForm store={dealerStore} onSaved={refresh} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
