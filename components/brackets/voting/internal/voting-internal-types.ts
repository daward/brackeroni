import type { ManagedBracket } from "@/lib/brackets/types";

export type VoteMatch = {
  id: string;
  status: string;
  roundNumber?: number | null;
  rankingTargetRank?: number | null;
  rankingRoundNumber?: number | null;
  subBracketName?: string | null;
  leftEntryId?: string | null;
  rightEntryId?: string | null;
  leftName?: string | null;
  rightName?: string | null;
  leftDescription?: string | null;
  rightDescription?: string | null;
  leftImageUrl?: string | null;
  rightImageUrl?: string | null;
  leftTags?: string[] | null;
  rightTags?: string[] | null;
  leftVoteCount?: number | null;
  rightVoteCount?: number | null;
  userVoteEntryId?: string | null;
} & Record<string, unknown>;

export type VoteTournament = ManagedBracket & {
  kind?: "standard" | "parallel_parent";
  matches?: VoteMatch[];
  entries?: Array<Record<string, unknown>>;
  description?: string | null;
  parentParallelTournamentId?: string | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
  archivedAt?: string | Date | null;
  updatedAt?: string | Date | null;
  viewerParticipantId?: string | null;
} & Record<string, unknown>;

export type VoteScreenPanelsProps = {
  activeTournaments: VoteTournament[];
  completedTournaments: VoteTournament[];
  completedHasNextPage?: boolean;
  initialFocusedTournamentId?: string | null;
  initialReturnTo?: string | null;
  signInRequiredTournament?: VoteTournament | null;
};

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message || fallback : fallback;
}
