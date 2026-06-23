import { notFound } from "next/navigation";
import { requireCurrentUserPage, getCurrentUser } from "@/lib/auth/current-user";
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

  await requireCurrentUserPage(`/results/${tournamentId}`);
  const user = await getCurrentUser();

  try {
    const [tournament, matchResult] = await Promise.all([
      getAccessibleTournamentById({
        tournamentId,
        userId: user.id
      }),
      listMatchesForTournament({
        tournamentId,
        userId: user.id
      })
    ]);

    return <TournamentResultsPage tournament={tournament} matches={matchResult.matches ?? []} />;
  } catch {
    notFound();
  }
}
