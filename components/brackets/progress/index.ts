/**
 * Public UI for viewing the outcome of one bracket after voting has begun.
 *
 * This feature owns the results/rounds/scoring navigation and the chronological
 * round-progress experience: round statistics, revealed versus hidden results,
 * final rankings, and creator-only reveal and sharing controls. Consumers
 * should import the two route-level components from this module, never from
 * `internal/`; the internals are free to change without becoming a dependency.
 */
export { BracketOutcomeNav } from "./internal/bracket-outcome-nav";
export { BracketProgressPage } from "./internal/bracket-progress-page";
export type { BracketOutcomeNavProps, BracketOutcomeView, BracketProgressMatch, BracketProgressPageProps, BracketProgressRound, BracketProgressTournament } from "./types";
