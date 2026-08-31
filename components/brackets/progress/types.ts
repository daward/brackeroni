/**
 * Public contracts accepted by the bracket-outcome UI.
 *
 * `BracketOutcome*` types configure the linked result views shown at the top of
 * an outcome route. `BracketProgress*` types are the route-ready data needed to
 * render the chronological rounds view and its optional creator controls.
 *
 * These types deliberately describe component inputs, not presentation policy
 * or private state. Reusable bracket records live in `lib/brackets/types`;
 * internal component props stay under `internal/`.
 */
import type { ReactNode } from "react";
import type { Bracket, BracketEntry, BracketMatch, BracketRound } from "@/lib/brackets/types";

/** Linked views that may be exposed for a bracket outcome. */
export type BracketOutcomeView = "results" | "rounds" | "scoring";

/** Props for the compact route-level navigation between available outcome views. */
export type BracketOutcomeNavProps = {
  bracketId: string;
  activeView?: BracketOutcomeView;
  showResults?: boolean;
  showRounds?: boolean;
  showScoring?: boolean;
  disabledReasonByKey?: Partial<Record<BracketOutcomeView, string>>;
  extraAction?: ReactNode;
  className?: string;
};

/** Tournament fields the progress page needs beyond the shared domain policies. */
export type BracketProgressTournament = Pick<Bracket, "id" | "title" | "status" | "resultMode"> & {
  entries?: BracketEntry[] | null;
};

/** A displayable tournament round, including its disclosure state and rank metadata. */
export type BracketProgressRound = BracketRound & {
  matchCount: number;
  status: string;
};

/** A progress match tied to the round that owns it. */
export type BracketProgressMatch = BracketMatch & {
  roundId: string;
  roundNumber: number;
};

/** Props for the route-level page that renders and tracks the visible round sequence. */
export type BracketProgressPageProps = {
  tournament: BracketProgressTournament;
  rounds: BracketProgressRound[];
  matches: BracketProgressMatch[];
  isCreator: boolean;
  outcomeNav?: ReactNode;
  headerAction?: ReactNode;
};
