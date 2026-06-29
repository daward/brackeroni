import { cookies } from "next/headers";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { listMatchesForTournament } from "@/lib/data/matches";
import { listAccessibleTournaments, listPublicTournaments } from "@/lib/data/tournaments";
import { VoteScreenPanels } from "@/components/vote-screen-panels";

export const metadata = {
  title: "Vote | Brackeroni"
};

export const dynamic = "force-dynamic";

export default async function VotePage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const user = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;
  const [accessibleTournaments, publicTournaments] = await Promise.all([
    user ? listAccessibleTournaments({ userId: user.id }) : Promise.resolve([]),
    listPublicTournaments({ statuses: ["active", "complete"], limit: 24 })
  ]);
  const tournaments = [...accessibleTournaments, ...publicTournaments].filter(
    (tournament, index, items) => items.findIndex((candidate) => candidate.id === tournament.id) === index
  );
  const activeTournaments = await Promise.all(
    tournaments
      .filter(
        (tournament) =>
          tournament.status === "active" &&
          (user || tournament.votingAccess === "anyone")
      )
      .map(async (tournament) => {
        const result = await listMatchesForTournament({
          tournamentId: tournament.id,
          userId: user?.id ?? null,
          anonymousVoterToken
        });

        return {
          ...tournament,
          matches: result.matches
        };
      })
  );
  const completedTournaments = tournaments.filter((tournament) => tournament.status === "complete");

  return (
    <div className="space-y-6">
      <VoteScreenPanels
        activeTournaments={activeTournaments}
        completedTournaments={completedTournaments}
        initialFocusedTournamentId={typeof params.tournament === "string" ? params.tournament : null}
        initialResultsTournamentId={typeof params.results === "string" ? params.results : null}
        initialReturnTo={typeof params.returnTo === "string" ? params.returnTo : null}
      />
    </div>
  );
}
