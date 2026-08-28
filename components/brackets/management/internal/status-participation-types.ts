import type { ReactNode } from "react";
import type { BracketInvite, Bracket } from "@/lib/brackets/types";

export type SummaryRow = { title: string; meta: string; action?: ReactNode };

export type ParticipationTrackerPanelProps = {
  tournament: Bracket;
  invitees: BracketInvite[];
  creatorVotesCast?: number;
  activeRoundVoteGoal?: number;
  creatorIsDone?: boolean;
  summaryRows?: SummaryRow[];
};

export type DetailsPanelProps = { items: Array<ReactNode | null | undefined | false> };

export type LiveInfoRowProps = {
  title: string;
  meta?: string | null;
  action?: ReactNode;
};
