import Link from "next/link";
import { PublicPoolCandidates } from "@/components/pools/shared";
import { PoolDetailWorkspace } from "@/components/pools/detail";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { pool } from "@/lib/pools";

export async function generateMetadata({ params }) {
  const { poolId } = await params;

  try {
    const poolDetail = await pool({ poolId, viewerUserId: null }).get();
    return {
      title: `${poolDetail.name} | Brackeroni`
    };
  } catch {
    return {
      title: "Pool | Brackeroni"
    };
  }
}

export default async function PublicPoolPage({ params }) {
  const user = await getOptionalCurrentUser();
  const { poolId } = await params;
  const poolDetail = await pool({
    poolId,
    viewerUserId: user?.id ?? null
  }).get({ candidateLimit: 24 });

  if (user && poolDetail.isOwned) {
    return <PoolDetailWorkspace initialPool={poolDetail} />;
  }

  return (
    <div className="space-y-6">
      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
            {poolDetail.visibility === "public_unlisted" ? "Shared Pool" : "Public Pool"}
          </p>
          <h1 className="display-face mt-2 text-3xl font-black">{poolDetail.name}</h1>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            {poolDetail.description || "A published pool ready to be turned into new brackets."}
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
            {poolDetail.candidateCount} candidates
          </p>
        </div>
        <div className="space-y-4 px-5 py-5">
          {user ? (
            <p className="text-sm leading-7 text-[var(--muted)]">
              This pool is published and locked. You can use it to make your own bracket, but you
              cannot edit its contents.
            </p>
          ) : (
            <p className="text-sm leading-7 text-[var(--muted)]">
              Sign in to save this pool into your workspace and build your own bracket from it.
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            {user ? (
              <Link href={`/brackets/configuration?poolId=${poolDetail.id}`} className="ui-button ui-button-primary">
                Make Bracket
              </Link>
            ) : (
              <Link
                href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/pools/${poolDetail.id}`)}`}
                className="ui-button ui-button-primary"
              >
                Sign In To Save Pool
              </Link>
            )}
            <Link href="/explore/pools" className="ui-button ui-button-muted">
              Browse Pools
            </Link>
          </div>
        </div>
      </section>

      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
          <h2 className="display-face text-2xl font-black uppercase tracking-[0.1em]">
            Candidates
          </h2>
        </div>
        <PublicPoolCandidates
          poolId={poolDetail.id}
          initialCandidates={poolDetail.candidates}
          initialPagination={poolDetail.candidatePagination}
        />
      </section>
    </div>
  );
}
