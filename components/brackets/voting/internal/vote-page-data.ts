import { listMatchesForTournament } from "@/lib/data/matches";
import {
  getAccessibleParallelTournamentById,
  listAccessibleParallelTournaments,
  listPublicParallelTournaments,
  openParallelTournamentParticipantBracket,
} from "@/lib/data/parallel-tournaments";
import { getAccessibleTournamentById, listAccessibleTournaments, listPublicTournaments } from "@/lib/data/tournaments";
import type { VoteMatch, VoteTournament } from "./voting-internal-types";

export type VotePageSearchParams = Record<string, string | string[] | undefined>;
export type VoteStatusFilter = Array<"active" | "complete">;

export type ParallelTournamentVoteIndexItem = {
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

export const getAccessibleParallelTournamentByIdForVote = getAccessibleParallelTournamentById as unknown as (args: {
  parallelTournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}) => Promise<ParallelTournamentVoteIndexItem>;

export const openParallelTournamentParticipantBracketForVote = openParallelTournamentParticipantBracket as unknown as (args: {
  parallelTournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}) => Promise<{ tournamentId: string }>;

export const listAccessibleTournamentsForVote = listAccessibleTournaments as unknown as (args: {
  userId: string;
  statuses: VoteStatusFilter;
  limit: number;
  offset: number;
}) => Promise<VoteTournament[]>;

export const listPublicTournamentsForVote = listPublicTournaments as unknown as (args: {
  statuses: VoteStatusFilter;
  limit: number;
}) => Promise<VoteTournament[]>;

export const listAccessibleParallelTournamentsForVote = listAccessibleParallelTournaments as unknown as (args: {
  userId: string;
  anonymousVoterToken: string | null;
  statuses: VoteStatusFilter;
  limit: number;
  offset: number;
}) => Promise<ParallelTournamentVoteIndexItem[]>;

export const listPublicParallelTournamentsForVote = listPublicParallelTournaments as unknown as (args: {
  statuses: VoteStatusFilter;
  limit: number;
}) => Promise<ParallelTournamentVoteIndexItem[]>;

export const listMatchesForTournamentForVote = listMatchesForTournament as unknown as (args: {
  tournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}) => Promise<{ matches: VoteMatch[] }>;

export const getAccessibleTournamentByIdForVote = getAccessibleTournamentById as unknown as (args: {
  tournamentId: string;
  userId: string | null;
  anonymousVoterToken: string | null;
}) => Promise<VoteTournament>;

export function firstParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

export function normalizeParallelTournamentForVoteIndex(item: ParallelTournamentVoteIndexItem): VoteTournament {
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
