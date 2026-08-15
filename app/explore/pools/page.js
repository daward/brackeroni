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
  const requestedPage = Number.parseInt(typeof params.page === "string" ? params.page : "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 24;
  const callbackQuery = new URLSearchParams();

  if (query) callbackQuery.set("q", query);

  const signInCallback = callbackQuery.size > 0
    ? `/explore/pools?${callbackQuery.toString()}`
    : "/explore/pools";
  const pools = await listPublicPools({
    limit: pageSize,
    offset: (page - 1) * pageSize,
    userId: user?.id ?? null,
    query,
    favoritesOnly: false
  });
  const hasNextPage = pools.length === pageSize;
  const pageHref = (nextPage) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    if (nextPage > 1) next.set("page", String(nextPage));
    const nextQuery = next.toString();
    return nextQuery ? `/explore/pools?${nextQuery}` : "/explore/pools";
  };

  return (
    <div className="public-pool-browse">
      <section>
        <div className="public-pool-browse-heading">
          <div className="public-pool-browse-heading-copy">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">Public Pools</p>
            <div>
              <h1 className="display-face text-3xl font-black">Browse Public Pools</h1>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Find a candidate set worth turning into a bracket.
              </p>
            </div>
          </div>
          <form method="get" className="public-pool-browse-search">
            <input type="search" name="q" defaultValue={query} placeholder="Search pools, candidates, or publishers" className="ui-field public-pool-browse-search-field" />
            <button type="submit" className="ui-button ui-button-accent-fill">Search</button>
          </form>
        </div>

        <div className="public-pool-browse-results-header">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
            {pools.length} pool{pools.length === 1 ? "" : "s"}{query ? ` matching "${query}"` : ""}
          </p>
          {!user ? (
            <Link href={`/api/auth/signin?callbackUrl=${encodeURIComponent(signInCallback)}`} className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-3)] transition hover:text-[var(--accent-2)]">
              Sign in to save
            </Link>
          ) : null}
        </div>

        {pools.length > 0 ? (
          <>
            <div className="public-pool-browse-list">
              {pools.map((pool) => (
                <div key={pool.id} className="public-pool-browse-list-item">
                  <PublicPoolCard pool={pool} href={`/pools/${pool.id}`} favoriteMode="inline" signedIn={Boolean(user)} />
                </div>
              ))}
            </div>
            {page > 1 || hasNextPage ? (
              <nav aria-label="Public pool pages" className="public-pool-browse-pagination">
                {page > 1 ? <Link href={pageHref(page - 1)} className="ui-button ui-button-secondary">Previous</Link> : <span />}
                {hasNextPage ? <Link href={pageHref(page + 1)} className="ui-button ui-button-secondary">Next</Link> : null}
              </nav>
            ) : null}
          </>
        ) : (
          <div className="public-pool-browse-empty">
            <p className="display-face text-xl font-black text-[var(--muted)]">No Pools Found</p>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Try a different search, or publish a pool from your create workspace.</p>
          </div>
        )}
      </section>
    </div>
  );
}
