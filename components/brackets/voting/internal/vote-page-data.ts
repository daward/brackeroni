import { bracketDirectory, bracketMatches, parallelBracketDirectory } from "@/lib/brackets";
import type { VoteMatch, VoteTournament } from "./voting-internal-types";

export type VotePageSearchParams = Record<string, string | string[] | undefined>;
export type VoteStatusFilter = Array<"active" | "complete">;

export type ParallelBracketVoteIndexItem = {
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

const directory = bracketDirectory();
const parallelDirectory = parallelBracketDirectory();

export function getAccessibleParallelBracketByIdForVote(args: {
  parallelBracketId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}): Promise<ParallelBracketVoteIndexItem> {
  return parallelDirectory.getAccessibleBracketById({
    parallelBracketId: args.parallelBracketId,
    userId: args.userId,
    anonymousVoterToken: args.anonymousVoterToken,
  }) as Promise<ParallelBracketVoteIndexItem>;
}

export function openParallelBracketParticipantForVote(args: {
  parallelBracketId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}): Promise<{ tournamentId: string }> {
  return parallelDirectory.openParticipantBracket({
    parallelBracketId: args.parallelBracketId,
    userId: args.userId,
    anonymousVoterToken: args.anonymousVoterToken,
  });
}

export const listAccessibleTournamentsForVote = directory.listAccessibleTournaments as unknown as (args: {
  userId: string;
  statuses: VoteStatusFilter;
  limit: number;
  offset: number;
}) => Promise<VoteTournament[]>;

export const listPublicTournamentsForVote = directory.listPublicTournaments as unknown as (args: {
  statuses: VoteStatusFilter;
  limit: number;
}) => Promise<VoteTournament[]>;

export const listAccessibleParallelBracketsForVote = parallelDirectory.listAccessibleBrackets as unknown as (args: {
  userId: string;
  anonymousVoterToken: string | null;
  statuses: VoteStatusFilter;
  limit: number;
  offset: number;
}) => Promise<ParallelBracketVoteIndexItem[]>;

export const listPublicParallelBracketsForVote = parallelDirectory.listPublicBrackets as unknown as (args: {
  statuses: VoteStatusFilter;
  limit: number;
}) => Promise<ParallelBracketVoteIndexItem[]>;

export const listMatchesForTournamentForVote = bracketMatches().list as unknown as (args: {
  tournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}) => Promise<{ matches: VoteMatch[] }>;

export const getAccessibleTournamentByIdForVote = directory.getAccessibleTournamentById as unknown as (args: {
  tournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}) => Promise<VoteTournament>;

export function firstParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export function normalizeParallelBracketForVoteIndex(item: ParallelBracketVoteIndexItem): VoteTournament {
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
