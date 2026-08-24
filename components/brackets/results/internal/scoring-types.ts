import type { ResultTournament, VoterScore, VoteHistoryEntry } from "../types";

export type ScoreCollectionProps = {
  scores: VoterScore[];
  selectedVoterKey?: string | null;
  onSelectVoter: (voterKey: string) => void;
  scoringEnabled: boolean;
};

export type VoterHistoryProps = {
  tournament: ResultTournament;
  votes: VoteHistoryEntry[];
  scoringEnabled: boolean;
};

export type VoterSummaryBarProps = {
  score: VoterScore | null;
  scoringEnabled: boolean;
};
