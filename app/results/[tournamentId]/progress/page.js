import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { listMatchesForTournament } from "@/lib/data/matches";
import { getParallelTournamentAggregateResults } from "@/lib/data/parallel-tournaments";
import { listRoundsForTournament } from "@/lib/data/rounds";
import { getAccessibleTournamentById } from "@/lib/data/tournaments";
import { BracketProgressPage } from "@/components/bracket-progress-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { tournamentId } = await params;

  return {
    title: `Progress | ${tournamentId} | Brackeroni`
  };
}

export default async function ProgressPage({ params }) {
  const { tournamentId } = await params;
  const user = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;

  try {
    const [tournament, rounds, matchResult] = await Promise.all([
      getAccessibleTournamentById({
        tournamentId,
        userId: user?.id ?? null,
        anonymousVoterToken
      }),
      listRoundsForTournament({
        tournamentId,
        userId: user?.id ?? null
      }),
      listMatchesForTournament({
        tournamentId,
        userId: user?.id ?? null,
        anonymousVoterToken
      })
    ]);
    const isCreator = Boolean(user?.id && tournament.creatorUserId === user.id);

    return (
      <BracketProgressPage
        tournament={tournament}
        rounds={rounds}
        matches={matchResult.matches ?? []}
        isCreator={isCreator}
      />
    );
  } catch (error) {
    if (error?.message === "NOT_FOUND") {
      try {
        await getParallelTournamentAggregateResults({
          parallelTournamentId: tournamentId,
          userId: user?.id ?? null,
          anonymousVoterToken
        });
      } catch {
        notFound();
      }

      redirect(`/results/${tournamentId}`);
    }

    throw error;
  }
}
