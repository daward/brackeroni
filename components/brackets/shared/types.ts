/** Public contracts for reusable bracket presentation components. */
import type { ElementType, MouseEvent } from "react";
import type { BracketCandidate } from "@/lib/brackets/types";

export type CompletedBracketCardProps = {
  tournament: {
    title: string;
    winner?: BracketCandidate | null;
  };
  as?: ElementType;
  href?: string;
  onClick?: (event: MouseEvent<HTMLElement>) => void;
  type?: "button" | "submit" | "reset";
  winnerLabel?: string | null;
  railClassName?: string;
  className?: string;
};

export type TournamentPublishWarningProps = {
  visibility?: string | null;
};
