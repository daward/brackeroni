import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { listMatchesForTournament } from "@/lib/data/matches";
import {
  getAccessibleParallelTournamentById,
  listAccessibleParallelTournaments,
  listPublicParallelTournaments,
  openParallelTournamentParticipantBracket
} from "@/lib/data/parallel-tournaments";
import {
  getAccessibleTournamentById,
  listAccessibleTournaments,
  listPublicTournaments
} from "@/lib/data/tournaments";
import { VoteScreenPanels } from "@/components/vote-screen-panels";

export const metadata = {
  title: "Vote | Brackeroni"
};

export const dynamic = "force-dynamic";

function normalizeParallelTournamentForVoteIndex(item) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    sourcePoolId: item.sourcePoolId,
    sourcePoolName: item.sourcePoolName,
    sharingMode: item.sharingMode,
    visibility: item.visibility,
    votingAccess: item.votingAccess,
    playStyle: "fixed_bracket",
    resultMode: "parallel_full_ranking",
    tieBreakMode: item.tieBreakMode,
    status: item.status,
    startedAt: item.startedAt,
    completedAt: item.completedAt,
    archivedAt: item.archivedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    entryCount: item.candidateCount ?? 0,
    participantCount: item.participantCount ?? 0,
    completedParticipantCount: item.completedParticipantCount ?? 0,
    viewerParticipantId: item.viewerParticipantId ?? null,
    viewerParticipantStatus: item.viewerParticipantStatus ?? null,
    viewerTournamentId: item.viewerTournamentId ?? null,
    kind: "parallel_parent",
    matches: []
  };
}

export default async function VotePage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const user = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;
  const requestedParallelTournamentId =
    typeof params.parallelTournament === "string" ? params.parallelTournament : null;

  if (requestedParallelTournamentId) {
    if (!user && !anonymousVoterToken) {
      const returnToParam = typeof params.returnTo === "string" ? `?returnTo=${params.returnTo}` : "";
      redirect(
        `/api/parallel-tournaments/${requestedParallelTournamentId}/participants/me${returnToParam}`
      );
    }

    const requestedParallelTournament = await getAccessibleParallelTournamentById({
      parallelTournamentId: requestedParallelTournamentId,
      userId: user?.id ?? null,
      anonymousVoterToken
    });

    if (requestedParallelTournament.viewerParticipantStatus === "complete") {
      redirect(`/results/${requestedParallelTournamentId}`);
    }

    const openedParallelTournament = await openParallelTournamentParticipantBracket({
      parallelTournamentId: requestedParallelTournamentId,
      userId: user?.id ?? null,
      anonymousVoterToken
    });
    const returnToParam = typeof params.returnTo === "string" ? `&returnTo=${params.returnTo}` : "";
    redirect(`/vote?tournament=${openedParallelTournament.tournamentId}${returnToParam}`);
  }

  const [
    accessibleTournaments,
    publicTournaments,
    accessibleParallelTournaments,
    publicParallelTournaments
  ] = await Promise.all([
    user ? listAccessibleTournaments({ userId: user.id }) : Promise.resolve([]),
    listPublicTournaments({ statuses: ["active", "complete"], limit: 24 }),
    user
      ? listAccessibleParallelTournaments({
          userId: user.id,
          anonymousVoterToken
        })
      : Promise.resolve([]),
    listPublicParallelTournaments({ statuses: ["active", "complete"], limit: 24 })
  ]);
  const requestedTournamentId = typeof params.tournament === "string" ? params.tournament : null;
  const tournaments = [
    ...accessibleTournaments.map((item) => ({ ...item, kind: "standard" })),
    ...publicTournaments.map((item) => ({ ...item, kind: "standard" })),
    ...accessibleParallelTournaments.map(normalizeParallelTournamentForVoteIndex),
    ...publicParallelTournaments.map(normalizeParallelTournamentForVoteIndex)
  ].filter(
    (tournament, index, items) => items.findIndex((candidate) => candidate.id === tournament.id) === index
  );
  const activeTournaments = await Promise.all(
    tournaments
      .filter(
        (tournament) =>
          tournament.status === "active" &&
          !(
            tournament.kind === "parallel_parent" &&
            tournament.viewerParticipantStatus === "complete"
          ) &&
          (user || tournament.visibility === "public_listed" || tournament.visibility === "public_unlisted")
      )
      .map(async (tournament) => {
        if (tournament.kind === "parallel_parent") {
          return tournament;
        }

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
  const completedTournaments = tournaments
    .filter((tournament) => {
      if (tournament.kind === "parallel_parent") {
        return (
          tournament.status === "complete" ||
          tournament.viewerParticipantStatus === "complete"
        );
      }

      return tournament.status === "complete";
    })
    .sort((left, right) => {
      const leftTime = left.completedAt ? new Date(left.completedAt).getTime() : 0;
      const rightTime = right.completedAt ? new Date(right.completedAt).getTime() : 0;

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      const leftUpdated = left.updatedAt ? new Date(left.updatedAt).getTime() : 0;
      const rightUpdated = right.updatedAt ? new Date(right.updatedAt).getTime() : 0;

      return rightUpdated - leftUpdated;
    });
  const requestedTournament =
    requestedTournamentId
      ? await getAccessibleTournamentById({
          tournamentId: requestedTournamentId,
          userId: user?.id ?? null,
          anonymousVoterToken
        }).catch(() => null)
      : null;
  const requestedTournamentMatches =
    requestedTournament && requestedTournament.status === "active"
      ? await listMatchesForTournament({
          tournamentId: requestedTournament.id,
          userId: user?.id ?? null,
          anonymousVoterToken
        }).then((result) => result.matches)
      : [];
  const requestedTournamentHasRemainingVotes = requestedTournamentMatches.some(
    (match) => match.status === "open" && !match.userVoteEntryId
  );

  if (
    requestedTournament &&
    requestedTournament.status === "active" &&
    requestedTournamentId &&
    !requestedTournamentHasRemainingVotes
  ) {
    redirect(`/results/${requestedTournament.parentParallelTournamentId || requestedTournament.id}`);
  }

  const requestedActiveTournament =
    requestedTournament && requestedTournament.status === "active"
      ? {
          ...requestedTournament,
          matches: requestedTournamentMatches
        }
      : null;
  const mergedActiveTournaments = requestedActiveTournament
    ? [
        requestedActiveTournament,
        ...activeTournaments.filter((tournament) => tournament.id !== requestedActiveTournament.id)
      ]
    : activeTournaments;
  const lockedFocusedTournament =
    !user && requestedTournamentId
      ? await getAccessibleTournamentById({
          tournamentId: requestedTournamentId,
          userId: null,
          anonymousVoterToken
        }).catch(() => null)
      : null;
  const signInRequiredTournament =
    lockedFocusedTournament &&
    lockedFocusedTournament.status === "active" &&
    lockedFocusedTournament.visibility === "private"
      ? lockedFocusedTournament
      : null;

  return (
    <div>
      <VoteScreenPanels
        activeTournaments={mergedActiveTournaments}
        completedTournaments={completedTournaments}
        initialFocusedTournamentId={requestedTournamentId}
        initialResultsTournamentId={typeof params.results === "string" ? params.results : null}
        initialReturnTo={typeof params.returnTo === "string" ? params.returnTo : null}
        signInRequiredTournament={signInRequiredTournament}
      />
    </div>
  );
}
