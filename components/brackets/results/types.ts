/** Public contracts for bracket result outcome pages and controls. */
import type { ReactNode } from "react";
import type { Bracket, BracketEntry, BracketMatch, SeedingStructure } from "@/lib/brackets/types";

export type ResultTournament = Pick<Bracket, "id" | "title" | "status" | "winner" | "participantCount" | "resultMode"> & {
  parentParallelTournamentId?: string | null;
  entries?: ResultEntry[] | null;
  seedingStructure?: ResultSeedingStructure | null;
  viewerParticipantId?: string | null;
};

export type ResultEntry = BracketEntry & {
  averageRank?: number | null;
  rankStdDev?: number | null;
  yourRank?: number | null;
  rankDifference?: number | null;
  participantEntryId?: string | null;
};

export type ResultMatch = BracketMatch & {
  roundId?: string | null;
  roundNumber?: number | null;
  rankingTargetRank?: number | null;
  rankingRoundNumber?: number | null;
  subBracketName?: string | null;
  userVoteEntryId?: string | null;
};

export type ResultSeedingStructure = Partial<SeedingStructure>;

export type ParallelParticipant = {
  id: string;
  name?: string | null;
  email?: string | null;
  candidateRanks: Record<string, { finalRank?: number | null; entryId?: string | null }>;
  matches: ResultMatch[];
};

export type VoterScore = {
  voterKey: string;
  name?: string | null;
  email?: string | null;
  score: number;
  winPercentage?: number | null;
  correctPicks: number;
  incorrectPicks: number;
  totalPicks: number;
  isCurrentViewer?: boolean;
};

export type VoteHistoryEntry = {
  matchId: string;
  roundNumber?: number | null;
  rankingTargetRank?: number | null;
  rankingRoundNumber?: number | null;
  selectedName: string;
  opponentName?: string | null;
  winnerName?: string | null;
  correct: boolean;
  pointsEarned: number;
};

export type BracketOutcomeHeaderProps = {
  title: string;
  meta?: string | null;
  kicker?: ReactNode;
  outcomeNav?: ReactNode;
  headerAction?: ReactNode;
  headerNotice?: ReactNode;
  className?: string;
};

export type ResultsLinkedViewOption = {
  value: string;
  label: string;
  href: string;
};

export type ResultsLinkedViewSelectProps = {
  value: string;
  options: ResultsLinkedViewOption[];
};

export type TournamentResultsPageProps = {
  tournament: ResultTournament;
  matches: ResultMatch[];
  outcomeNav?: ReactNode;
  headerAction?: ReactNode;
  headerNotice?: ReactNode;
};

export type ParallelResultsPageProps = {
  tournament: ResultTournament;
  aggregateEntries: ResultEntry[];
  participants: ParallelParticipant[];
  completedBallotCount: number;
  canInspectAllParticipants: boolean;
  headerAction?: ReactNode;
};

export type TournamentScoringPageProps = {
  tournament: ResultTournament;
  voterScores: VoterScore[];
  voteHistoryByVoterKey: Record<string, VoteHistoryEntry[]>;
  canInspectAllVoterScores: boolean;
  scoringEnabled: boolean;
  outcomeNav?: ReactNode;
  headerAction?: ReactNode;
};
