import Link from "next/link";
import { redirect } from "next/navigation";
import { CandidateTagList } from "@/components/candidate-tag-list";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { getPoolById } from "@/lib/data/pools";

export async function generateMetadata({ params }) {
  const { poolId } = await params;

  try {
    const pool = await getPoolById({ poolId, userId: null });
    return {
      title: `${pool.name} | Brackeroni`
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
  const pool = await getPoolById({
    poolId,
    userId: user?.id ?? null
  });

  if (user && pool.visibility === "public_unlisted" && !pool.isOwned) {
    redirect(`/create?favoritePool=${pool.id}`);
  }

  return (
    <div className="space-y-6">
      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
            {pool.visibility === "public_unlisted" ? "Shared Pool" : "Public Pool"}
          </p>
          <h1 className="display-face mt-2 text-3xl font-black">{pool.name}</h1>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
            {pool.description || "A published pool ready to be turned into new brackets."}
          </p>
          <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
            {pool.candidateCount} candidates
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
              <Link href={`/create?makeBracketFromPool=${pool.id}`} className="ui-button ui-button-primary">
                Make Bracket
              </Link>
            ) : (
              <Link
                href={`/api/auth/signin?callbackUrl=${encodeURIComponent(`/pools/${pool.id}`)}`}
                className="ui-button ui-button-primary"
              >
                Sign In To Save Pool
              </Link>
            )}
            <Link href="/pools" className="ui-button ui-button-muted">
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
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 xl:grid-cols-3">
          {pool.candidates.map((candidate) => (
            <div
              key={candidate.id}
              className="overflow-hidden border border-[var(--line)] bg-[var(--panel-2)]"
            >
              {candidate.imageUrl ? (
                <img
                  src={candidate.imageUrl}
                  alt={candidate.name}
                  className="h-40 w-full object-cover"
                />
              ) : null}
              <div className="px-4 py-4">
                <p className="display-face text-lg font-black">{candidate.name}</p>
                <CandidateTagList tags={candidate.tags} className="mt-2" />
                {candidate.description ? (
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    {candidate.description}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
