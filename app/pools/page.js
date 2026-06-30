import Link from "next/link";
import { PublicPoolCard } from "@/components/public-pool-card";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { listPublicPools } from "@/lib/data/pools";

export const metadata = {
  title: "Public Pools | Brackeroni"
};

export const dynamic = "force-dynamic";

export default async function PublicPoolsPage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const user = await getOptionalCurrentUser();
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const savedOnly = params.saved === "1";
  const callbackQuery = new URLSearchParams();

  if (query) {
    callbackQuery.set("q", query);
  }

  if (savedOnly) {
    callbackQuery.set("saved", "1");
  }

  const signInCallback = callbackQuery.size > 0 ? `/pools?${callbackQuery.toString()}` : "/pools";
  const pools = await listPublicPools({
    limit: 120,
    userId: user?.id ?? null,
    query,
    favoritesOnly: savedOnly
  });

  return (
    <div className="space-y-4">
      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
            Public Pools
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="display-face text-3xl font-black">Make Your Own Bracket</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Browse published pools, save the ones you want, then turn them into your own
                brackets.
              </p>
            </div>
            <Link href="/create" className="ui-button ui-button-primary">
              Create From Scratch
            </Link>
          </div>
        </div>

        <div className="border-b border-[var(--line)] px-5 py-4">
          <form method="get" className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search pools, candidates, or publishers"
              className="ui-field ui-field-panel"
            />
            {user ? (
              <label className="flex items-center gap-3 border border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)]">
                <input
                  type="checkbox"
                  name="saved"
                  value="1"
                  defaultChecked={savedOnly}
                  className="accent-[var(--accent-3)]"
                />
                Saved only
              </label>
            ) : null}
            <button type="submit" className="ui-button ui-button-accent-fill">
              Search
            </button>
          </form>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {pools.length} pool{pools.length === 1 ? "" : "s"}
            {savedOnly ? " saved" : ""}
            {query ? ` matching "${query}"` : ""}
          </p>
          {!user ? (
            <Link
              href={`/api/auth/signin?callbackUrl=${encodeURIComponent(signInCallback)}`}
              className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-3)] transition hover:text-[var(--accent-2)]"
            >
              Sign in to save
            </Link>
          ) : null}
        </div>

        {pools.length > 0 ? (
          <div className="grid gap-px bg-[var(--line)]">
            {pools.map((pool) => (
              <PublicPoolCard
                key={pool.id}
                pool={pool}
                href={`/pools/${pool.id}`}
                favoriteMode="inline"
                signedIn={Boolean(user)}
              />
            ))}
          </div>
        ) : (
          <div className="px-5 py-8">
            <p className="display-face text-xl font-black text-[var(--muted)]">No Pools Found</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Try a different search, or publish a pool from your create workspace.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
