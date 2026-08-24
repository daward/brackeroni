/**
 * Public route-level UI for bracket result outcomes.
 *
 * Consumers should import result pages, linked outcome controls, and shared
 * outcome headers from this root. Implementation files stay private.
 */
export { BracketOutcomeHeader } from "./internal/bracket-outcome-header";
export { ParallelResultsPage } from "./internal/parallel-results-page";
export { ResultsLinkedViewSelect } from "./internal/results-linked-view-select";
export { TournamentResultsPage } from "./internal/tournament-results-page";
export { TournamentScoringPage } from "./internal/tournament-scoring-page";
export type {
  BracketOutcomeHeaderProps,
  ParallelResultsPageProps,
  ResultsLinkedViewOption,
  ResultsLinkedViewSelectProps,
  TournamentResultsPageProps,
  TournamentScoringPageProps,
} from "./types";
