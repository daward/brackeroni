import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import {
  firstParam,
  getAccessibleParallelBracketByIdForVote,
  getAccessibleTournamentByIdForVote,
  listAccessibleParallelBracketsForVote,
  listAccessibleTournamentsForVote,
  listMatchesForTournamentForVote,
  listPublicParallelBracketsForVote,
  listPublicTournamentsForVote,
  normalizeParallelBracketForVoteIndex,
  openParallelBracketParticipantForVote,
} from "./vote-page-data";
import { VoteScreenPanels } from "./vote-screen-panels";
import type { VoteMatch, VoteTournament } from "./voting-internal-types";
import type { VotePageSearchParams } from "./vote-page-data";

export default async function BracketVotingPage({ searchParams }: { searchParams?: Promise<VotePageSearchParams> }) {
  const params = (await searchParams) ?? {};
  const user = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;
  const votePage = Math.max(1, Number.parseInt(firstParam(params.page) ?? "1", 10) || 1);
  const voteOffset = (votePage - 1) * 12;
  const requestedParallelBracketId = firstParam(params.parallelBracket);

  if (requestedParallelBracketId) {
    if (!user && !anonymousVoterToken) {
      const returnToParam = typeof params.returnTo === "string" ? `?returnTo=${params.returnTo}` : "";
      redirect(`/api/parallel-brackets/${requestedParallelBracketId}/participants/me${returnToParam}`);
    }

    const requestedParallelBracket = await getAccessibleParallelBracketByIdForVote({
      parallelBracketId: requestedParallelBracketId,
      userId: user?.id ?? null,
      anonymousVoterToken,
    });

    if (requestedParallelBracket.viewerParticipantStatus === "complete") {
      redirect(`/results/${requestedParallelBracketId}`);
    }

    const openedParallelBracket = await openParallelBracketParticipantForVote({
      parallelBracketId: requestedParallelBracketId,
      userId: user?.id ?? null,
      anonymousVoterToken,
    });
    const returnTo = firstParam(params.returnTo);
    const returnToParam = returnTo ? `&returnTo=${returnTo}` : "";
    redirect(`/vote?bracket=${openedParallelBracket.bracketId}${returnToParam}`);
  }

  const [accessibleTournaments, publicTournaments, accessibleParallelBrackets, publicParallelBrackets] = await Promise.all([
    user
      ? listAccessibleTournamentsForVote({
          userId: user.id,
          statuses: ["active", "complete"],
          limit: 12,
          offset: voteOffset,
        })
      : Promise.resolve([]),
    listPublicTournamentsForVote({ statuses: ["active", "complete"], limit: 12 }),
    user
      ? listAccessibleParallelBracketsForVote({
          userId: user.id,
          anonymousVoterToken,
          statuses: ["active", "complete"],
          limit: 12,
          offset: voteOffset,
        })
      : Promise.resolve([]),
    listPublicParallelBracketsForVote({ statuses: ["active", "complete"], limit: 12 }),
  ]);
  const requestedTournamentId = firstParam(params.bracket);
  const tournaments: VoteTournament[] = [
    ...accessibleTournaments.map((item) => ({ ...item, kind: "standard" as const }) as VoteTournament),
    ...publicTournaments.map((item) => ({ ...item, kind: "standard" as const }) as VoteTournament),
    ...accessibleParallelBrackets.map(normalizeParallelBracketForVoteIndex),
    ...publicParallelBrackets.map(normalizeParallelBracketForVoteIndex),
  ].filter((tournament, index, items) => items.findIndex((candidate) => candidate.id === tournament.id) === index);
  const activeTournaments = await Promise.all(
    tournaments
      .filter(
        (tournament) =>
          tournament.status === "active" &&
          !(tournament.kind === "parallel_parent" && tournament.viewerParticipantStatus === "complete") &&
          (user || tournament.visibility === "public_listed" || tournament.visibility === "public_unlisted"),
      )
      .map(async (tournament) => {
        if (tournament.kind === "parallel_parent") {
          return tournament;
        }

        const result = await listMatchesForTournamentForVote({
          tournamentId: tournament.id,
          userId: user?.id ?? null,
          anonymousVoterToken,
        });

        return {
          ...tournament,
          matches: result.matches,
        };
      }),
  );
  const completedTournaments = tournaments
    .filter((tournament) => {
      if (tournament.kind === "parallel_parent") {
        return tournament.status === "complete" || tournament.viewerParticipantStatus === "complete";
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
    })
    .slice(0, 12);
  const requestedTournament = requestedTournamentId
    ? await getAccessibleTournamentByIdForVote({
        bracketId: requestedTournamentId,
        userId: user?.id ?? null,
        anonymousVoterToken,
      }).catch(() => null)
    : null;
  const requestedTournamentMatches: VoteMatch[] =
    requestedTournament && requestedTournament.status === "active"
      ? await listMatchesForTournamentForVote({
          tournamentId: requestedTournament.id,
          userId: user?.id ?? null,
          anonymousVoterToken,
        }).then((result) => result.matches)
      : [];
  const requestedTournamentHasRemainingVotes = requestedTournamentMatches.some((match: VoteMatch) => match.status === "open" && !match.userVoteEntryId);

  if (requestedTournament && requestedTournament.status === "active" && requestedTournamentId && !requestedTournamentHasRemainingVotes) {
    if (firstParam(params.returnTo) === "create") {
      redirect("/brackets?stage=active");
    }

    redirect(`/results/${requestedTournament.parentParallelTournamentId || requestedTournament.id}`);
  }

  const requestedActiveTournament =
    requestedTournament && requestedTournament.status === "active"
      ? {
          ...requestedTournament,
          matches: requestedTournamentMatches,
        }
      : null;
  const mergedActiveTournaments = requestedActiveTournament
    ? [
        requestedActiveTournament,
        ...activeTournaments.filter(
          (tournament) =>
            tournament.id !== requestedActiveTournament.id &&
            // A participant's parallel bracket has the same title as its parent.
            // Once that participant bracket is open, it replaces the parent in the
            // vote index instead of appearing as a second, indistinguishable card.
            tournament.id !== requestedActiveTournament.parentParallelTournamentId,
        ),
      ]
    : activeTournaments;
  const lockedFocusedTournament =
    !user && requestedTournamentId
      ? await getAccessibleTournamentByIdForVote({
          bracketId: requestedTournamentId,
          userId: null,
          anonymousVoterToken,
        }).catch(() => null)
      : null;
  const signInRequiredTournament: VoteTournament | null =
    lockedFocusedTournament && lockedFocusedTournament.status === "active" && lockedFocusedTournament.visibility === "private" ? lockedFocusedTournament : null;

  return (
    <div>
      <VoteScreenPanels
        activeTournaments={mergedActiveTournaments}
        completedTournaments={completedTournaments}
        completedHasNextPage={
          [accessibleTournaments, publicTournaments, accessibleParallelBrackets, publicParallelBrackets].some(
            (items) => items.length >= 12,
          )
        }
        initialFocusedTournamentId={requestedTournamentId}
        initialReturnTo={firstParam(params.returnTo)}
        signInRequiredTournament={signInRequiredTournament}
      />
    </div>
  );
}
