import { notFound } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { cookies } from "next/headers";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { listMatchesForTournament } from "@/lib/data/matches";
import { getAccessibleTournamentById } from "@/lib/data/tournaments";
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

  try {
    const [tournament, matchResult] = await Promise.all([
      getAccessibleTournamentById({
        tournamentId,
        userId: user?.id ?? null
      }),
      listMatchesForTournament({
        tournamentId,
        userId: user?.id ?? null,
        anonymousVoterToken: cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null
      })
    ]);

    return <TournamentResultsPage tournament={tournament} matches={matchResult.matches ?? []} />;
  } catch {
    notFound();
  }
}
