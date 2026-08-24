import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getOptionalCurrentUser } from "@/lib/auth/current-user";
import { ANONYMOUS_VOTER_COOKIE } from "@/lib/auth/viewer";
import { listMatchesForTournament } from "@/lib/data/matches";
import {
  getAccessibleParallelTournamentById,
  listAccessibleParallelTournaments,
  listPublicParallelTournaments,
  openParallelTournamentParticipantBracket,
} from "@/lib/data/parallel-tournaments";
import { getAccessibleTournamentById, listAccessibleTournaments, listPublicTournaments } from "@/lib/data/tournaments";
import { VoteScreenPanels } from "./vote-screen-panels";
import type { VoteMatch, VoteTournament } from "./voting-internal-types";

type VotePageSearchParams = Record<string, string | string[] | undefined>;
type VoteStatusFilter = Array<"active" | "complete">;

type ParallelTournamentVoteIndexItem = {
  id: string;
  title: string;
  description?: string | null;
  sourcePoolId?: string | null;
  sourcePoolName?: string | null;
  sharingMode?: VoteTournament["sharingMode"];
  visibility?: VoteTournament["visibility"];
  votingAccess?: string | null;
  resultMode?: string | null;
  tieBreakMode?: string | null;
  status: VoteTournament["status"];
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  archivedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt?: string | Date | null;
  candidateCount?: number | null;
  participantCount?: number | null;
  completedParticipantCount?: number | null;
  viewerParticipantId?: string | null;
  viewerParticipantStatus?: string | null;
  viewerTournamentId?: string | null;
  winnerImageUrl?: string | null;
};

const getAccessibleParallelTournamentByIdForVote = getAccessibleParallelTournamentById as unknown as (args: {
  parallelTournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}) => Promise<ParallelTournamentVoteIndexItem>;
const openParallelTournamentParticipantBracketForVote = openParallelTournamentParticipantBracket as unknown as (args: {
  parallelTournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}) => Promise<{ tournamentId: string }>;
const listAccessibleTournamentsForVote = listAccessibleTournaments as unknown as (args: {
  userId: string;
  statuses: VoteStatusFilter;
  limit: number;
  offset: number;
}) => Promise<VoteTournament[]>;
const listPublicTournamentsForVote = listPublicTournaments as unknown as (args: {
  statuses: VoteStatusFilter;
  limit: number;
}) => Promise<VoteTournament[]>;
const listAccessibleParallelTournamentsForVote = listAccessibleParallelTournaments as unknown as (args: {
  userId: string;
  anonymousVoterToken: string | null;
  statuses: VoteStatusFilter;
  limit: number;
  offset: number;
}) => Promise<ParallelTournamentVoteIndexItem[]>;
const listPublicParallelTournamentsForVote = listPublicParallelTournaments as unknown as (args: {
  statuses: VoteStatusFilter;
  limit: number;
}) => Promise<ParallelTournamentVoteIndexItem[]>;
const listMatchesForTournamentForVote = listMatchesForTournament as unknown as (args: {
  tournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}) => Promise<{ matches: VoteMatch[] }>;
const getAccessibleTournamentByIdForVote = getAccessibleTournamentById as unknown as (args: {
  tournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}) => Promise<VoteTournament>;

function firstParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function normalizeParallelTournamentForVoteIndex(item: ParallelTournamentVoteIndexItem): VoteTournament {
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
    resultMode: item.resultMode || "parallel_full_ranking",
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
    winnerImageUrl: item.winnerImageUrl ?? null,
    kind: "parallel_parent",
    matches: [],
  };
}

export default async function BracketVotingPage({ searchParams }: { searchParams?: Promise<VotePageSearchParams> }) {
  const params = (await searchParams) ?? {};
  const user = await getOptionalCurrentUser();
  const cookieStore = await cookies();
  const anonymousVoterToken = cookieStore.get(ANONYMOUS_VOTER_COOKIE)?.value ?? null;
  const votePage = Math.max(1, Number.parseInt(firstParam(params.page) ?? "1", 10) || 1);
  const voteOffset = (votePage - 1) * 12;
  const requestedParallelTournamentId = firstParam(params.parallelTournament);

  if (requestedParallelTournamentId) {
    if (!user && !anonymousVoterToken) {
      const returnToParam = typeof params.returnTo === "string" ? `?returnTo=${params.returnTo}` : "";
      redirect(`/api/parallel-tournaments/${requestedParallelTournamentId}/participants/me${returnToParam}`);
    }

    const requestedParallelTournament = await getAccessibleParallelTournamentByIdForVote({
      parallelTournamentId: requestedParallelTournamentId,
      userId: user?.id ?? null,
      anonymousVoterToken,
    });

    if (requestedParallelTournament.viewerParticipantStatus === "complete") {
      redirect(`/results/${requestedParallelTournamentId}`);
    }

    const openedParallelTournament = await openParallelTournamentParticipantBracketForVote({
      parallelTournamentId: requestedParallelTournamentId,
      userId: user?.id ?? null,
      anonymousVoterToken,
    });
    const returnTo = firstParam(params.returnTo);
    const returnToParam = returnTo ? `&returnTo=${returnTo}` : "";
    redirect(`/vote?tournament=${openedParallelTournament.tournamentId}${returnToParam}`);
  }

  const [accessibleTournaments, publicTournaments, accessibleParallelTournaments, publicParallelTournaments] = await Promise.all([
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
      ? listAccessibleParallelTournamentsForVote({
          userId: user.id,
          anonymousVoterToken,
          statuses: ["active", "complete"],
          limit: 12,
          offset: voteOffset,
        })
      : Promise.resolve([]),
    listPublicParallelTournamentsForVote({ statuses: ["active", "complete"], limit: 12 }),
  ]);
  const requestedTournamentId = firstParam(params.tournament);
  const tournaments: VoteTournament[] = [
    ...accessibleTournaments.map((item) => ({ ...item, kind: "standard" as const })),
    ...publicTournaments.map((item) => ({ ...item, kind: "standard" as const })),
    ...accessibleParallelTournaments.map(normalizeParallelTournamentForVoteIndex),
    ...publicParallelTournaments.map(normalizeParallelTournamentForVoteIndex),
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
        tournamentId: requestedTournamentId,
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
          tournamentId: requestedTournamentId,
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
          [accessibleTournaments, publicTournaments, accessibleParallelTournaments, publicParallelTournaments].some(
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
