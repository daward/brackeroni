import { cookies } from "next/headers";
import Link from "next/link";
import { PublicPoolCard } from "@/components/public-pool-card";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { listPublicPools } from "@/lib/data/pools";
import { getFeaturedPublicMatchup } from "@/lib/data/tournaments";

function proxiedImageUrl(url) {
  if (!url) {
    return "";
  }

  return `/api/image-proxy?url=${encodeURIComponent(url)}`;
}

export default async function HomePage() {
  const currentUser = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;
  const [featuredPublicMatchup, publicPools] = await Promise.all([
    getFeaturedPublicMatchup({
      userId: currentUser?.id ?? null,
      anonymousVoterToken
    }),
    listPublicPools({ limit: 6, userId: currentUser?.id ?? null })
  ]);

  return (
    <div className="space-y-4">
      <section className="border border-[var(--line)] bg-[var(--panel)]">
        <div className="grid gap-px bg-[var(--line)] lg:grid-cols-[1.3fr_0.7fr]">
          <div className="flex h-full items-center justify-center bg-[var(--panel)] px-6 py-2 sm:px-5 sm:py-3">
            <img
              src="/bracket_hero_first_style_no_spark1.svg?v=3"
              alt="Make decisions, settle debates, build brackets"
              className="block w-full max-w-[36rem] translate-y-1"
            />
          </div>
          <div className="bg-[var(--panel-3)] p-0">
            <Link
              href="/tools/import"
              className="flex h-full flex-col justify-start bg-[linear-gradient(180deg,rgba(52,211,196,0.08),transparent_45%),var(--panel-3)] px-5 py-4 transition hover:bg-[linear-gradient(180deg,rgba(52,211,196,0.14),transparent_45%),var(--panel)] sm:px-6 sm:py-5"
            >
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                Bookmarklet Importer
              </p>
              <p className="mt-2 display-face text-lg font-black">Don&apos;t start from scratch!</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Found a great list, article, or ranking already? Install the bookmarklet and pull
                any web page straight into Brackeroni&apos;s import flow.
              </p>
              <p className="mt-4 text-[11px] uppercase tracking-[0.18em] text-[var(--accent-2)]">
                Set Up Import
              </p>
            </Link>
          </div>
        </div>
      </section>

      <div className="xl:grid xl:grid-cols-2 xl:gap-6">
        <section className="border border-[var(--line)] bg-[var(--panel)]">
          {featuredPublicMatchup ? (
            <Link
              href={`/vote?tournament=${featuredPublicMatchup.tournamentId}`}
              className="group block bg-[var(--panel)] transition hover:bg-[var(--panel-2)]"
            >
              <div className="border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                  Vote Right Now
                </p>
                <h2 className="display-face mt-1 text-2xl font-black sm:text-3xl">
                  {featuredPublicMatchup.tournamentTitle}
                </h2>
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[var(--muted)]">
                  Round {featuredPublicMatchup.roundNumber} • Live Public Matchup
                </p>
              </div>
              <div className="grid gap-px bg-[var(--line)]">
                {featuredPublicMatchup.matches.map((match) => (
                  <div
                    key={match.matchId}
                    className="grid gap-px bg-[var(--line)] md:grid-cols-[1fr_auto_1fr]"
                  >
                    <FeaturedHomeMatchCard
                      name={match.leftName}
                      seed={match.leftSeed}
                      imageUrl={match.leftImageUrl}
                    />
                    <div className="flex items-center justify-center bg-[var(--panel-3)] px-5 py-6">
                      <div className="text-center">
                        <p className="display-face text-2xl font-black tracking-[0.18em] text-[var(--accent-2)]">
                          Vs
                        </p>
                      </div>
                    </div>
                    <FeaturedHomeMatchCard
                      name={match.rightName}
                      seed={match.rightSeed}
                      imageUrl={match.rightImageUrl}
                    />
                  </div>
                ))}
              </div>
            </Link>
          ) : (
            <Link
              href="/vote"
              className="group flex min-h-full flex-col bg-[var(--panel)] transition hover:bg-[var(--panel-2)]"
            >
              <div className="px-5 py-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                  Public Brackets
                </p>
                <p className="display-face mt-3 text-2xl font-black text-[var(--muted)]">
                  No Live Public Matchup
                </p>
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
                  Browse current voting and finished results.
                </p>
              </div>
            </Link>
          )}
        </section>

        <section className="mt-4 border border-[var(--line)] bg-[var(--panel)] xl:mt-0">
          <div className="flex min-h-full flex-col bg-[var(--panel)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] bg-[var(--panel-3)] px-5 py-4">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--accent-3)]">
                  Public Pools
                </p>
                <h2 className="display-face mt-2 text-3xl font-black">
                  <Link href="/create?view=pools" className="transition hover:text-[var(--accent-3)]">
                    Make Your Own Bracket
                  </Link>
                </h2>
              </div>
              <Link
                href="/create?view=pools"
                className="display-face text-xs font-bold uppercase tracking-[0.18em] text-[var(--accent-3)] transition hover:text-[var(--accent-2)]"
              >
                Browse
              </Link>
            </div>
            <div className="grid flex-1 gap-px bg-[var(--line)]">
              {publicPools.length === 0 ? (
                <div className="bg-[var(--panel)] px-5 py-6">
                  <p className="display-face text-xl font-black text-[var(--muted)]">
                    No Public Pools Yet
                  </p>
                </div>
              ) : (
                publicPools.map((pool) => <PublicPoolCard key={pool.id} pool={pool} />)
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeaturedHomeMatchCard({ name, seed, imageUrl }) {
  return (
    <div className="group/card bg-[var(--panel)]">
      <div className="border-b border-[var(--line)] px-4 py-2">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--accent-2)]">Seed {seed}</p>
      </div>
      <div className="relative h-44 overflow-hidden bg-[var(--panel-3)] sm:h-52">
        {imageUrl ? (
          <>
            <img
              src={proxiedImageUrl(imageUrl)}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl saturate-125"
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),rgba(15,15,15,0.08)_40%,rgba(15,15,15,0.72)_100%)]" />
            <img
              src={proxiedImageUrl(imageUrl)}
              alt={name}
              className="relative z-10 h-full w-full object-contain object-bottom px-2 pb-0 pt-2 transition duration-200 group-hover/card:scale-[1.03] sm:px-3 sm:pt-3"
            />
            <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(180deg,transparent,rgba(10,10,10,0.82)_55%,rgba(10,10,10,0.98))] px-4 pb-3 pt-10 sm:px-5 sm:pb-4">
              <p className="display-face text-lg font-black leading-tight sm:text-xl">{name}</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-full items-end bg-[linear-gradient(180deg,rgba(52,211,196,0.08),rgba(15,15,15,0.95))] p-3" />
            <div className="absolute inset-x-0 bottom-0 z-20 bg-[linear-gradient(180deg,transparent,rgba(10,10,10,0.82)_55%,rgba(10,10,10,0.98))] px-4 pb-3 pt-10 sm:px-5 sm:pb-4">
              <p className="display-face text-lg font-black leading-tight sm:text-xl">{name}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
