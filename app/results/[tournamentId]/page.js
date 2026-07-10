import Link from "next/link";
import { notFound } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { cookies } from "next/headers";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { listMatchesForTournament } from "@/lib/data/matches";
import { getParallelTournamentAggregateResults } from "@/lib/data/parallel-tournaments";
import { getAccessibleTournamentById } from "@/lib/data/tournaments";
import { ParallelResultsPage } from "@/components/parallel-results-page";
import { TournamentResultsPage } from "@/components/tournament-results-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { tournamentId } = await params;

  return {
    title: `Results | ${tournamentId} | Brackeroni`
  };
}

export default async function ResultsPage({ params }) {
  const { tournamentId } = await params;
  const user = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;

  try {
    const [tournament, matchResult] = await Promise.all([
      getAccessibleTournamentById({
        tournamentId,
        userId: user?.id ?? null,
        anonymousVoterToken
      }),
      listMatchesForTournament({
        tournamentId,
        userId: user?.id ?? null,
        anonymousVoterToken
      })
    ]);

    const isParallelChildResult = Boolean(tournament.parentParallelTournamentId);

    return (
      <TournamentResultsPage
        tournament={tournament}
        matches={matchResult.matches ?? []}
        headerAction={
          isParallelChildResult ? (
            <Link
              href={`/results/${tournament.parentParallelTournamentId}`}
              className="ui-button ui-button-primary"
            >
              View Live Aggregate
            </Link>
          ) : null
        }
        headerNotice={
          isParallelChildResult ? (
            <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              These are your personal ballot results for this parallel bracket.
              <span className="ml-2">
                <Link
                  href={`/results/${tournament.parentParallelTournamentId}`}
                  className="text-[var(--accent-3)] underline-offset-4 hover:underline"
                >
                  View the live aggregate results.
                </Link>
              </span>
            </div>
          ) : tournament.status === "active" ? (
            <div className="border border-[var(--line)] bg-[var(--panel-2)] px-4 py-3 text-sm leading-6 text-[var(--muted)]">
              You already voted in the currently available matchup for this bracket.
              <span className="ml-2">These are the live results while voting continues.</span>
            </div>
          ) : null
        }
      />
    );
  } catch (standardError) {
    try {
      const parallelResults = await getParallelTournamentAggregateResults({
        parallelTournamentId: tournamentId,
        userId: user?.id ?? null,
        anonymousVoterToken
      });

      return (
        <ParallelResultsPage
          tournament={parallelResults.tournament}
          aggregateEntries={parallelResults.aggregateEntries}
          participants={parallelResults.participants}
          completedBallotCount={parallelResults.completedBallotCount}
          canInspectAllParticipants={parallelResults.canInspectAllParticipants}
        />
      );
    } catch {
      if (standardError?.message === "PARALLEL_TOURNAMENTS_REQUIRES_MIGRATION") {
        throw standardError;
      }

      notFound();
    }
  }
}
