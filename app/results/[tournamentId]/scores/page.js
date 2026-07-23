import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { listTournamentVoterScores } from "@/lib/data/matches";
import { getAccessibleTournamentById } from "@/lib/data/tournaments";
import { TournamentScoringPage } from "@/components/tournament-scoring-page";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { tournamentId } = await params;

  return {
    title: `Scoring | ${tournamentId} | Brackeroni`
  };
}

export default async function TournamentScoringRoute({ params }) {
  const { tournamentId } = await params;
  const user = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;

  try {
    const tournament = await getAccessibleTournamentById({
      tournamentId,
      userId: user?.id ?? null,
      anonymousVoterToken
    });

    if (tournament.parentParallelTournamentId) {
      notFound();
    }

    const voterScoreboard = await listTournamentVoterScores({
      tournament,
      userId: user?.id ?? null,
      anonymousVoterToken,
      includeVoteHistory: true
    });

    return (
      <TournamentScoringPage
        tournament={tournament}
        voterScores={voterScoreboard.scores}
        voteHistoryByVoterKey={voterScoreboard.voteHistoryByVoterKey}
        canInspectAllVoterScores={voterScoreboard.canInspectAllScores}
        scoringEnabled={voterScoreboard.scoringEnabled}
      />
    );
  } catch {
    notFound();
  }
}
