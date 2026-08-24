import type { ParallelParticipant, ResultEntry, ResultMatch, ResultTournament } from "../types";

export type AggregateSortKey = "aggregateRank" | "show" | "yourRank" | "rankDifference" | "averageRank" | "rankStdDev";

export type AggregateSortDirection = "asc" | "desc";

export type AggregateResultEntry = ResultEntry & {
  candidateId: string;
  finalRank: number;
  averageRank: number | null;
  rankStdDev: number | null;
  yourRank?: number | null;
  rankDifference?: number | null;
};

export type ParticipantEntry = AggregateResultEntry & {
  participantEntryId: string;
};

export type AggregateEntryDetailsProps = {
  selectedEntry: AggregateResultEntry | null;
  participants: ParallelParticipant[];
  viewerParticipant: ParallelParticipant | null;
  hasOpenBallots: boolean;
};

export type AggregateResultsTableProps = {
  entries: AggregateResultEntry[];
  selectedEntryId?: string | null;
  onSelectEntry: (entryId: string) => void;
  sortKey: AggregateSortKey;
  sortDirection: AggregateSortDirection;
  onToggleSort: (nextKey: AggregateSortKey) => void;
};

export type CandidateHistoryProps = {
  tournament: ResultTournament;
  selectedEntry: AggregateResultEntry | ParticipantEntry;
  selectedParticipant: ParallelParticipant | null;
  historyMatches: ResultMatch[];
};

export type ParticipantEntryDetailsProps = {
  tournament: ResultTournament;
  selectedEntry: AggregateResultEntry | null;
  participantEntry: ParticipantEntry | null;
  selectedParticipant: ParallelParticipant | null;
  selectedParticipantHistory: ResultMatch[];
  includeParticipantName?: boolean;
};

export type ParticipantScore = {
  id: string;
  name: string;
  rank: number;
};
